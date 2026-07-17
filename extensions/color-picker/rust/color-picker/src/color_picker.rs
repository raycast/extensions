mod lib;

use lib::colors::RgbColor;
use lib::constants::*;
use lib::cursor;
use lib::drawing;
use raycast_rust_macros::raycast;
use serde::Serialize;
use std::mem;
use windows::{
    core::w,
    Win32::{
        Foundation::*,
        Graphics::Gdi::*,
        Graphics::GdiPlus::{GdiplusShutdown, GdiplusStartup, GdiplusStartupInput},
        System::LibraryLoader::GetModuleHandleW,
        UI::HiDpi::{SetProcessDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2},
        UI::Input::KeyboardAndMouse::VK_ESCAPE,
        UI::WindowsAndMessaging::*,
    },
};

// Global keyboard hook handle
static mut KEYBOARD_HOOK: HHOOK = unsafe { mem::zeroed() };

static mut PREVIEW_HEIGHT: i32 = 0;
static mut TOTAL_HEIGHT: i32 = WINDOW_SIZE;

// Dynamic zoom level
static mut ZOOM_LEVEL: i32 = ZOOM;
static mut LOUPE_SIZE_DYN: i32 = LOUPE_SIZE;
static mut WINDOW_SIZE_DYN: i32 = WINDOW_SIZE;
static mut CROSSHAIR_HALF_DYN: i32 = CROSSHAIR_HALF;

// Window handles
static mut LOUPE_HWND: HWND = unsafe { mem::zeroed() };

static mut PICKED_COLOR: Option<(u8, u8, u8)> = None;
static mut CANCELLED: bool = false;

// Cached screen snapshot (captured with loupe hidden to avoid self-capture)
static mut SNAP_DC: HDC = unsafe { mem::zeroed() };
static mut SNAP_BMP: HBITMAP = unsafe { mem::zeroed() };
static mut SNAP_OLD: HGDIOBJ = unsafe { mem::zeroed() };
static mut SNAP_PIXEL: COLORREF = COLORREF(0);
static mut GDIP_TOKEN: usize = 0;

/// Low-level keyboard hook to capture ESC globally without taking focus
unsafe extern "system" fn keyboard_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    unsafe {
        if code >= 0 && wparam.0 == WM_KEYDOWN as usize {
            // lparam points to a KBDLLHOOKSTRUCT
            // The vkCode is at offset 0 (u32)
            let vk_code = *(lparam.0 as *const u32);
            if vk_code == VK_ESCAPE.0 as u32 {
                CANCELLED = true;
                PostQuitMessage(0);
                return LRESULT(1); // Return 1 to block the key
            }
        }
        CallNextHookEx(Some(KEYBOARD_HOOK), code, wparam, lparam)
    }
}

/// Window procedure for the magnifier loupe overlay.
unsafe extern "system" fn wnd_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    unsafe {
        match msg {
            WM_TIMER => {
                let mut pt = POINT::default();
                let _ = GetCursorPos(&mut pt);

                // Capture screen snapshot around cursor into cached DC
                // (loupe is excluded from capture via WDA_EXCLUDEFROMCAPTURE)
                let hscreen_dc = GetDC(None);
                let _ = BitBlt(
                    SNAP_DC, 0, 0,
                    CAPTURE_SIZE, CAPTURE_SIZE,
                    Some(hscreen_dc),
                    pt.x - CAPTURE_SIZE / 2,
                    pt.y - CAPTURE_SIZE / 2,
                    SRCCOPY,
                );
                SNAP_PIXEL = GetPixel(hscreen_dc, pt.x, pt.y);
                ReleaseDC(None, hscreen_dc);

                // Center the loupe on the cursor (no clamping — let it go off-screen)
                let half = WINDOW_SIZE_DYN / 2;
                let lx = pt.x - half;
                let ly = pt.y - half;

                let _ = SetWindowPos(
                    hwnd,
                    Some(HWND_TOPMOST),
                    lx,
                    ly,
                    WINDOW_SIZE_DYN,
                    TOTAL_HEIGHT,
                    SWP_NOACTIVATE | SWP_SHOWWINDOW,
                );
                
                // Continuously hide cursor (system UI can reset it)
                cursor::hide_cursor();
                
                let _ = InvalidateRect(Some(hwnd), None, false);
                LRESULT(0)
            }
            WM_PAINT => {
                let mut ps = PAINTSTRUCT::default();
                let hdc = BeginPaint(hwnd, &mut ps);

                // Create memory DC for compositing
                let hmem_dc = CreateCompatibleDC(Some(hdc));
                let hbmp = CreateCompatibleBitmap(hdc, WINDOW_SIZE_DYN, TOTAL_HEIGHT);
                let hold = SelectObject(hmem_dc, hbmp.into());

                // Fill background with border color
                let border_brush = CreateSolidBrush(COLORREF(COLOR_BORDER_REF));
                let bg_rect = RECT { left: 0, top: 0, right: WINDOW_SIZE_DYN, bottom: TOTAL_HEIGHT };
                let _ = FillRect(hmem_dc, &bg_rect, border_brush);
                let _ = DeleteObject(border_brush.into());

                // Clip magnified content to inner circle
                let inner_rgn = CreateEllipticRgn(BORDER_W, BORDER_W, BORDER_W + LOUPE_SIZE_DYN, BORDER_W + LOUPE_SIZE_DYN);
                SelectClipRgn(hmem_dc, Some(inner_rgn));

                // StretchBlt from cached snapshot (not live screen — avoids self-capture)
                let _ = SetStretchBltMode(hmem_dc, COLORONCOLOR);
                let _ = StretchBlt(
                    hmem_dc,
                    BORDER_W, BORDER_W,
                    LOUPE_SIZE_DYN, LOUPE_SIZE_DYN,
                    Some(SNAP_DC),
                    0, 0,
                    CAPTURE_SIZE, CAPTURE_SIZE,
                    SRCCOPY,
                );

                // Draw crosshair around the center pixel
                drawing::draw_crosshair(hmem_dc, WINDOW_SIZE_DYN, CROSSHAIR_HALF_DYN, ZOOM_LEVEL);

                // Remove clip region so we can draw the border ring
                SelectClipRgn(hmem_dc, None);

                // Draw circular border ring using GDI+ for anti-aliasing
                drawing::draw_border_ring(hmem_dc, WINDOW_SIZE_DYN);

                // --- Color preview rectangle below the loupe ---
                // Get pixel color and prepare text
                let color = RgbColor::from_colorref(SNAP_PIXEL);
                let hex_text = color.to_hex_string();
                let mut wide: Vec<u16> = hex_text.encode_utf16().collect();

                // Create high-quality Segoe UI font with anti-aliasing
                let hfont = drawing::create_ui_font();
                let old_font = SelectObject(hmem_dc, hfont.into());

                let mut text_size = SIZE { cx: 0, cy: 0 };
                let _ = GetTextExtentPoint32W(hmem_dc, &wide, &mut text_size);

                // Calculate preview rectangle size with padding
                let preview_width = text_size.cx + PREVIEW_PADDING_H * 2;
                let preview_height = text_size.cy + PREVIEW_PADDING_V * 2;
                let preview_left = (WINDOW_SIZE_DYN - preview_width) / 2;
                let preview_top = WINDOW_SIZE_DYN + PREVIEW_GAP;

                // Update global height for window positioning (include border expansion)
                PREVIEW_HEIGHT = preview_height;
                TOTAL_HEIGHT = WINDOW_SIZE_DYN + PREVIEW_GAP + preview_height + PREVIEW_BORDER + 1;

                let preview_rect = RECT {
                    left: preview_left,
                    top: preview_top,
                    right: preview_left + preview_width,
                    bottom: preview_top + preview_height,
                };

                // Draw colored preview rectangle with rounded corners
                drawing::draw_preview_rect(hmem_dc, &preview_rect, &color);

                // Determine text color based on background luminance
                let txt_clr = color.text_color();

                SetBkMode(hmem_dc, TRANSPARENT);
                SetTextColor(hmem_dc, txt_clr);

                let mut text_rect = preview_rect;
                let _ = DrawTextW(
                    hmem_dc,
                    &mut wide,
                    &mut text_rect,
                    DT_CENTER | DT_VCENTER | DT_SINGLELINE,
                );

                SelectObject(hmem_dc, old_font);
                let _ = DeleteObject(hfont.into());

                // Update window region dynamically based on text size
                drawing::update_window_region(hwnd, &preview_rect, WINDOW_SIZE_DYN);

                // Blit composited result to window
                let _ = BitBlt(hdc, 0, 0, WINDOW_SIZE_DYN, TOTAL_HEIGHT, Some(hmem_dc), 0, 0, SRCCOPY);

                SelectObject(hmem_dc, hold);
                let _ = DeleteObject(hbmp.into());
                let _ = DeleteDC(hmem_dc);
                let _ = DeleteObject(inner_rgn.into());

                let _ = EndPaint(hwnd, &ps);
                LRESULT(0)
            }
            WM_MOUSEWHEEL => {
                // Get wheel delta (positive = scroll up/zoom in, negative = scroll down/zoom out)
                let delta = ((wparam.0 as i32) >> 16) as i16;
                
                if delta > 0 {
                    // Scroll up: zoom in
                    ZOOM_LEVEL = (ZOOM_LEVEL + 1).min(ZOOM_MAX);
                } else if delta < 0 {
                    // Scroll down: zoom out
                    ZOOM_LEVEL = (ZOOM_LEVEL - 1).max(ZOOM_MIN);
                }
                
                // Recalculate dimensions
                LOUPE_SIZE_DYN = CAPTURE_SIZE * ZOOM_LEVEL;
                WINDOW_SIZE_DYN = LOUPE_SIZE_DYN + BORDER_W * 2;
                CROSSHAIR_HALF_DYN = ZOOM_LEVEL / 2;
                
                // Force redraw on the loupe window (not the input window)
                let _ = InvalidateRect(Some(LOUPE_HWND), None, false);
                LRESULT(0)
            }
            WM_KEYDOWN => {
                LRESULT(0)
            }
            WM_LBUTTONDOWN => {
                // Left click picks the color
                let color = RgbColor::from_colorref(SNAP_PIXEL);
                PICKED_COLOR = Some((color.r, color.g, color.b));
                PostQuitMessage(0);
                LRESULT(0)
            }
            WM_RBUTTONDOWN => {
                // Right click does nothing and prevents context menu
                LRESULT(0)
            }
            WM_MBUTTONDOWN => {
                // Middle click cancels
                CANCELLED = true;
                PostQuitMessage(0);
                LRESULT(0)
            }
            WM_DESTROY => {
                PostQuitMessage(0);
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }
}

#[derive(Serialize)]
struct Color {
    red: f32,
    green: f32,
    blue: f32,
    alpha: f32,
    #[serde(rename = "colorSpace")]
    color_space: String,
}

#[raycast]
fn pick_color() -> std::result::Result<Option<Color>, String> {
    unsafe {
        // Make process DPI-aware so coordinates match screen pixels
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

        // Initialize GDI+ for anti-aliased drawing
        let gdip_input = GdiplusStartupInput {
            GdiplusVersion: 1,
            ..Default::default()
        };
        let mut token: usize = 0;
        GdiplusStartup(&mut token, &gdip_input, std::ptr::null_mut());
        GDIP_TOKEN = token;

        PICKED_COLOR = None;
        CANCELLED = false;

        // Initialize dynamic zoom values
        ZOOM_LEVEL = ZOOM;
        LOUPE_SIZE_DYN = LOUPE_SIZE;
        WINDOW_SIZE_DYN = WINDOW_SIZE;
        CROSSHAIR_HALF_DYN = CROSSHAIR_HALF;

        // Initialize preview dimensions
        PREVIEW_HEIGHT = 30;
        TOTAL_HEIGHT = WINDOW_SIZE + PREVIEW_GAP + PREVIEW_HEIGHT + PREVIEW_BORDER + 1;

        // Create snapshot DC for caching screen captures
        let hscreen_dc = GetDC(None);
        SNAP_DC = CreateCompatibleDC(Some(hscreen_dc));
        SNAP_BMP = CreateCompatibleBitmap(hscreen_dc, CAPTURE_SIZE, CAPTURE_SIZE);
        SNAP_OLD = SelectObject(SNAP_DC, SNAP_BMP.into());
        ReleaseDC(None, hscreen_dc);

        // Get initial cursor position to center loupe
        let mut pt = POINT::default();
        let _ = GetCursorPos(&mut pt);
        let half = WINDOW_SIZE / 2;
        let initial_x = pt.x - half;
        let initial_y = pt.y - half;

        // Register a layered window class for the loupe
        let class_name = w!("RaycastColorPickerLoupe");
        let hinstance: HINSTANCE = GetModuleHandleW(None).map_err(|e| e.to_string())?.into();

        let wc = WNDCLASSEXW {
            cbSize: mem::size_of::<WNDCLASSEXW>() as u32,
            style: CS_HREDRAW | CS_VREDRAW,
            lpfnWndProc: Some(wnd_proc),
            hInstance: hinstance,
            hCursor: LoadCursorW(None, IDC_CROSS).map_err(|e| e.to_string())?,
            lpszClassName: class_name,
            ..Default::default()
        };

        let atom = RegisterClassExW(&wc);
        if atom == 0 {
            return Err("Failed to register window class".to_string());
        }

        // Create a popup tool window centered on cursor (no taskbar button)
        let hwnd = CreateWindowExW(
            WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_LAYERED,
            class_name,
            w!(""),
            WS_POPUP,
            initial_x, initial_y,
            WINDOW_SIZE,
            TOTAL_HEIGHT,
            None,
            None,
            Some(hinstance),
            None,
        ).map_err(|e| e.to_string())?;

        // Store loupe window handle for cross-window invalidation
        LOUPE_HWND = hwnd;

        // Make the window semi-opaque
        let _ = SetLayeredWindowAttributes(hwnd, COLORREF(0), ALPHA_OPAQUE, LWA_ALPHA);

        // Exclude loupe from screen capture so it doesn't capture itself
        let _ = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);

        // Create an invisible fullscreen input window to capture mouse & keyboard globally
        let input_class = w!("RaycastColorPickerInput");
        let input_wc = WNDCLASSEXW {
            cbSize: mem::size_of::<WNDCLASSEXW>() as u32,
            style: WNDCLASS_STYLES(0),
            lpfnWndProc: Some(wnd_proc),
            hInstance: hinstance,
            hCursor: LoadCursorW(None, IDC_CROSS).map_err(|e| e.to_string())?,
            lpszClassName: input_class,
            ..Default::default()
        };
        RegisterClassExW(&input_wc);

        let screen_w = GetSystemMetrics(SM_CXVIRTUALSCREEN);
        let screen_h = GetSystemMetrics(SM_CYVIRTUALSCREEN);
        let screen_x = GetSystemMetrics(SM_XVIRTUALSCREEN);
        let screen_y = GetSystemMetrics(SM_YVIRTUALSCREEN);

        let input_hwnd = CreateWindowExW(
            WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_LAYERED,
            input_class,
            w!(""),
            WS_POPUP,
            screen_x, screen_y,
            screen_w, screen_h,
            None,
            None,
            Some(hinstance),
            None,
        ).map_err(|e| e.to_string())?;

        // Fully transparent input window
        let _ = SetLayeredWindowAttributes(input_hwnd, COLORREF(0), ALPHA_TRANSPARENT, LWA_ALPHA);

        // Show windows WITHOUT taking focus (preserves Raycast window)
        let _ = ShowWindow(input_hwnd, SW_SHOWNOACTIVATE);
        let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);

        // Install global keyboard hook to capture ESC without requiring focus
        let hmod = GetModuleHandleW(None).unwrap_or_default();
        KEYBOARD_HOOK = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_hook), Some(HINSTANCE(hmod.0)), 0).unwrap_or_default();


        // Hide the real cursor
        cursor::hide_cursor();

        // Start a timer to update position ~60fps
        let _ = SetTimer(Some(hwnd), TIMER_ID, TIMER_INTERVAL_MS, None);

        // Message loop
        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        // Cleanup
        let _ = KillTimer(Some(hwnd), TIMER_ID);
        if KEYBOARD_HOOK.0 as *mut _ as usize != 0 {
            let _ = UnhookWindowsHookEx(KEYBOARD_HOOK);
        }
        let _ = DestroyWindow(hwnd);
        let _ = DestroyWindow(input_hwnd);
        let _ = UnregisterClassW(class_name, Some(hinstance));
        let _ = UnregisterClassW(input_class, Some(hinstance));

        // Cleanup snapshot DC
        SelectObject(SNAP_DC, SNAP_OLD);
        let _ = DeleteObject(SNAP_BMP.into());
        let _ = DeleteDC(SNAP_DC);

        // Restore cursor
        cursor::show_cursor();

        // Shutdown GDI+
        GdiplusShutdown(GDIP_TOKEN);

        if CANCELLED {
            return Ok(None);
        }

        match PICKED_COLOR {
            Some((r, g, b)) => Ok(Some(Color {
                red: r as f32 / 255.0,
                green: g as f32 / 255.0,
                blue: b as f32 / 255.0,
                alpha: 1.0,
                color_space: "sRGB".to_string(),
            })),
            None => Ok(None),
        }
    }
}
