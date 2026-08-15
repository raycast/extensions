use raycast_rust_macros::raycast;
use std::mem;
use std::ptr::null_mut;
use windows::{
    core::{w, PCWSTR},
    Win32::{
        Foundation::*,
        Graphics::Gdi::*,
        Graphics::GdiPlus::{
            FillModeAlternate, GdipAddPathArc, GdipClosePathFigure, GdipCreateFont,
            GdipCreateFontFamilyFromName, GdipCreateFromHDC, GdipCreatePath, GdipCreatePen1,
            GdipCreateSolidFill, GdipDeleteBrush, GdipDeleteFont, GdipDeleteFontFamily,
            GdipDeleteGraphics, GdipDeletePath, GdipDeletePen, GdipDrawLineI, GdipDrawRectangleI,
            GdipDrawString, GdipFillPath, GdipFillRectangleI, GdipMeasureString,
            GdipSetSmoothingMode, GdipSetTextRenderingHint, GdipStringFormatGetGenericDefault,
            GdiplusShutdown, GdiplusStartup, GdiplusStartupInput, GpFont, GpFontFamily,
            GpGraphics, GpPath, GpPen, GpSolidFill, GpStringFormat, RectF, SmoothingModeAntiAlias,
            Status, TextRenderingHintAntiAlias, Unit,
        },
        System::LibraryLoader::GetModuleHandleW,
        UI::HiDpi::{SetProcessDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2},
        UI::Input::KeyboardAndMouse::*,
        UI::WindowsAndMessaging::*,
    },
};

const TIMER_ID: usize = 1;
const TIMER_INTERVAL_MS: u32 = 16;
const SHIFT_POLL_TIMER_ID: usize = 2;
const SHIFT_POLL_MS: u32 = 50;

const COLOR_BG_BLUE_ARGB: u32 = 0x0C0000FF; // ~5% blue
const COLOR_BORDER_RED_ARGB: u32 = 0x80FF0000; // 50% red
const COLOR_LINE_RED_ARGB: u32 = 0xFFFF0000;
const COLOR_LINE_GREEN_ARGB: u32 = 0xFF22C55E;
const COLOR_OVERLAY_BG_ARGB: u32 = 0xFF404040;
const COLOR_OVERLAY_TEXT_ARGB: u32 = 0xFFFFFFFF;

const UNIT_PIXEL: Unit = Unit(2);

#[derive(Clone, Copy, Default)]
struct Pt {
    x: i32,
    y: i32,
}

/// RAII guard that unregisters a window class on drop, even on `?` early returns.
struct ClassGuard {
    name: windows::core::PCWSTR,
    hinstance: HINSTANCE,
}

impl Drop for ClassGuard {
    fn drop(&mut self) {
        unsafe {
            let _ = UnregisterClassW(self.name, Some(self.hinstance));
        }
    }
}

/// RAII guard that calls `GdiplusShutdown` on drop, even on `?` early returns.
struct GdiplusGuard {
    token: usize,
}

impl Drop for GdiplusGuard {
    fn drop(&mut self) {
        unsafe {
            GdiplusShutdown(self.token);
        }
    }
}

static mut HWND_RULER: HWND = HWND(null_mut());
static mut KB_HOOK: HHOOK = HHOOK(null_mut());
static mut GDIP_TOKEN: usize = 0;

static mut SX: i32 = 0;
static mut SY: i32 = 0;
static mut SW: i32 = 0;
static mut SH: i32 = 0;

static mut DRAG_MODE: bool = false;
static mut START: Option<Pt> = None;
static mut CURRENT: Pt = Pt { x: 0, y: 0 };
static mut SHIFT_PRESSED: bool = false;

static mut RESULT_DIST: Option<i32> = None;
static mut CANCELLED: bool = false;

static mut DIB_DC: HDC = HDC(null_mut());
static mut DIB_BMP: HBITMAP = HBITMAP(null_mut());
static mut DIB_OLD: HGDIOBJ = HGDIOBJ(null_mut());
static mut DIB_BITS: *mut u8 = null_mut();

fn distance(a: Pt, b: Pt) -> i32 {
    let dx = (b.x - a.x) as f64;
    let dy = (b.y - a.y) as f64;
    (dx * dx + dy * dy).sqrt().round() as i32
}

fn snap_to_angle(start: Pt, end: Pt) -> Pt {
    let dx = (end.x - start.x) as f64;
    let dy = (end.y - start.y) as f64;
    let dist = (dx * dx + dy * dy).sqrt();
    if dist < 0.5 {
        return end;
    }
    let mut angle_deg = dy.atan2(dx).to_degrees();
    let interval = 10.0_f64;
    let r = angle_deg.rem_euclid(interval);
    angle_deg += if r < interval / 2.0 { -r } else { interval - r };
    let rad = angle_deg.to_radians();
    Pt {
        x: start.x + (dist * rad.cos()).round() as i32,
        y: start.y + (dist * rad.sin()).round() as i32,
    }
}

fn is_axis_aligned(start: Pt, end: Pt) -> bool {
    let dx = (end.x - start.x).abs();
    let dy = (end.y - start.y).abs();
    dx < 2 || dy < 2
}

fn effective_endpoint(start: Pt, current: Pt, shift: bool) -> Pt {
    if shift {
        snap_to_angle(start, current)
    } else {
        current
    }
}

fn line_is_straight(start: Pt, end: Pt, shift: bool) -> bool {
    if is_axis_aligned(start, end) {
        return true;
    }
    if shift {
        let dx = (end.x - start.x) as f64;
        let dy = (end.y - start.y) as f64;
        let angle = dy.atan2(dx).to_degrees().abs();
        if (angle.rem_euclid(90.0)).min(90.0 - angle.rem_euclid(90.0)) < 0.5 {
            return true;
        }
    }
    false
}

unsafe fn draw_overlay_box(graphics: *mut GpGraphics, x: i32, y: i32, text: &str) {
    let family_name: Vec<u16> = "Segoe UI\0".encode_utf16().collect();
    let mut family: *mut GpFontFamily = std::ptr::null_mut();
    if GdipCreateFontFamilyFromName(PCWSTR(family_name.as_ptr()), std::ptr::null_mut(), &mut family)
        != Status(0)
    {
        return;
    }
    let mut font: *mut GpFont = std::ptr::null_mut();
    GdipCreateFont(family, 13.0, 0, UNIT_PIXEL, &mut font);

    let mut format: *mut GpStringFormat = std::ptr::null_mut();
    GdipStringFormatGetGenericDefault(&mut format);

    let text_wide: Vec<u16> = text.encode_utf16().collect();
    let pcwstr = PCWSTR(text_wide.as_ptr());

    let layout = RectF {
        X: 0.0,
        Y: 0.0,
        Width: 1000.0,
        Height: 100.0,
    };
    let mut bbox = RectF {
        X: 0.0,
        Y: 0.0,
        Width: 0.0,
        Height: 0.0,
    };
    GdipMeasureString(
        graphics,
        pcwstr,
        text_wide.len() as i32,
        font,
        &layout,
        format,
        &mut bbox,
        std::ptr::null_mut(),
        std::ptr::null_mut(),
    );

    let pad_h = 10.0_f32;
    let pad_v = 5.0_f32;
    let box_w = bbox.Width + pad_h * 2.0;
    let box_h = bbox.Height + pad_v * 2.0;

    // Clamp to screen so the overlay stays visible
    let mut fx = x as f32;
    let mut fy = y as f32;
    if fx + box_w > SW as f32 {
        fx = SW as f32 - box_w;
    }
    if fy + box_h > SH as f32 {
        fy = SH as f32 - box_h;
    }
    if fx < 0.0 {
        fx = 0.0;
    }
    if fy < 0.0 {
        fy = 0.0;
    }

    // Rounded background
    let mut path: *mut GpPath = std::ptr::null_mut();
    GdipCreatePath(FillModeAlternate, &mut path);
    let corner = 8.0_f32;
    let d = corner * 2.0;
    GdipAddPathArc(path, fx, fy, d, d, 180.0, 90.0);
    GdipAddPathArc(path, fx + box_w - d, fy, d, d, 270.0, 90.0);
    GdipAddPathArc(path, fx + box_w - d, fy + box_h - d, d, d, 0.0, 90.0);
    GdipAddPathArc(path, fx, fy + box_h - d, d, d, 90.0, 90.0);
    GdipClosePathFigure(path);

    let mut bg_brush: *mut GpSolidFill = std::ptr::null_mut();
    GdipCreateSolidFill(COLOR_OVERLAY_BG_ARGB, &mut bg_brush);
    GdipFillPath(graphics, bg_brush as *mut _, path);
    GdipDeleteBrush(bg_brush as *mut _);
    GdipDeletePath(path);

    // Text
    let mut text_brush: *mut GpSolidFill = std::ptr::null_mut();
    GdipCreateSolidFill(COLOR_OVERLAY_TEXT_ARGB, &mut text_brush);
    let text_rect = RectF {
        X: fx + pad_h,
        Y: fy + pad_v,
        Width: bbox.Width,
        Height: bbox.Height,
    };
    GdipDrawString(
        graphics,
        pcwstr,
        text_wide.len() as i32,
        font,
        &text_rect,
        format,
        text_brush as *mut _,
    );
    GdipDeleteBrush(text_brush as *mut _);

    GdipDeleteFont(font);
    GdipDeleteFontFamily(family);
}

unsafe fn render() {
    if DIB_BITS.is_null() {
        return;
    }

    // Clear buffer to fully transparent
    std::ptr::write_bytes(DIB_BITS, 0, (SW * SH * 4) as usize);

    let mut graphics: *mut GpGraphics = std::ptr::null_mut();
    GdipCreateFromHDC(DIB_DC, &mut graphics);
    GdipSetSmoothingMode(graphics, SmoothingModeAntiAlias);
    GdipSetTextRenderingHint(graphics, TextRenderingHintAntiAlias);

    // Background tint (very subtle blue)
    let mut bg_brush: *mut GpSolidFill = std::ptr::null_mut();
    GdipCreateSolidFill(COLOR_BG_BLUE_ARGB, &mut bg_brush);
    GdipFillRectangleI(graphics, bg_brush as *mut _, 0, 0, SW, SH);
    GdipDeleteBrush(bg_brush as *mut _);

    // Red border
    let mut border_pen: *mut GpPen = std::ptr::null_mut();
    GdipCreatePen1(COLOR_BORDER_RED_ARGB, 1.0, UNIT_PIXEL, &mut border_pen);
    GdipDrawRectangleI(graphics, border_pen, 0, 0, SW - 1, SH - 1);
    GdipDeletePen(border_pen);

    // Line
    let shift = SHIFT_PRESSED;
    if let Some(start) = START {
        let end = effective_endpoint(start, CURRENT, shift);
        let color = if line_is_straight(start, end, shift) {
            COLOR_LINE_GREEN_ARGB
        } else {
            COLOR_LINE_RED_ARGB
        };

        let mut line_pen: *mut GpPen = std::ptr::null_mut();
        GdipCreatePen1(color, 2.0, UNIT_PIXEL, &mut line_pen);
        GdipDrawLineI(
            graphics,
            line_pen,
            start.x - SX,
            start.y - SY,
            end.x - SX,
            end.y - SY,
        );
        GdipDeletePen(line_pen);

        let dist = distance(start, end);
        let dist_text = format!("{} pixels", dist);
        draw_overlay_box(graphics, end.x - SX + 12, end.y - SY + 12, &dist_text);
    }

    // Cursor coordinates overlay (coordinates only — distance is shown near the endpoint)
    let cur = CURRENT;
    let coord_text = format!("{} \u{00D7} {}", cur.x - SX, cur.y - SY);
    draw_overlay_box(graphics, cur.x - SX + 12, cur.y - SY - 28, &coord_text);

    GdipDeleteGraphics(graphics);

    // Premultiply alpha for UpdateLayeredWindow with AC_SRC_ALPHA
    let len = (SW as usize) * (SH as usize) * 4;
    let bits = std::slice::from_raw_parts_mut(DIB_BITS, len);
    let mut i = 0;
    while i < len {
        let a = bits[i + 3] as u32;
        if a == 0 {
            bits[i] = 0;
            bits[i + 1] = 0;
            bits[i + 2] = 0;
        } else if a != 255 {
            bits[i] = ((bits[i] as u32 * a) / 255) as u8;
            bits[i + 1] = ((bits[i + 1] as u32 * a) / 255) as u8;
            bits[i + 2] = ((bits[i + 2] as u32 * a) / 255) as u8;
        }
        i += 4;
    }

    // Push to layered window
    let hdc_screen = GetDC(None);
    let src_pt = POINT { x: 0, y: 0 };
    let win_pt = POINT { x: SX, y: SY };
    let size = SIZE { cx: SW, cy: SH };
    let blend = BLENDFUNCTION {
        BlendOp: AC_SRC_OVER as u8,
        BlendFlags: 0,
        SourceConstantAlpha: 255,
        AlphaFormat: AC_SRC_ALPHA as u8,
    };
    let _ = UpdateLayeredWindow(
        HWND_RULER,
        Some(hdc_screen),
        Some(&win_pt),
        Some(&size),
        Some(DIB_DC),
        Some(&src_pt),
        COLORREF(0),
        Some(&blend),
        ULW_ALPHA,
    );
    ReleaseDC(None, hdc_screen);
}

unsafe extern "system" fn kb_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    unsafe {
        if code >= 0 {
            let vk = *(lparam.0 as *const u32);
            let evt = wparam.0 as u32;
            if evt == WM_KEYDOWN || evt == WM_SYSKEYDOWN {
                if vk == VK_ESCAPE.0 as u32 {
                    if START.is_some() {
                        START = None;
                        render();
                    } else {
                        CANCELLED = true;
                        PostQuitMessage(0);
                    }
                    return LRESULT(1);
                }
                if vk == VK_SHIFT.0 as u32
                    || vk == VK_LSHIFT.0 as u32
                    || vk == VK_RSHIFT.0 as u32
                {
                    if !SHIFT_PRESSED {
                        SHIFT_PRESSED = true;
                        render();
                    }
                }
            } else if evt == WM_KEYUP || evt == WM_SYSKEYUP {
                if vk == VK_SHIFT.0 as u32
                    || vk == VK_LSHIFT.0 as u32
                    || vk == VK_RSHIFT.0 as u32
                {
                    if SHIFT_PRESSED {
                        SHIFT_PRESSED = false;
                        render();
                    }
                }
            }
        }
        CallNextHookEx(Some(KB_HOOK), code, wparam, lparam)
    }
}

unsafe fn finish_with_distance(start: Pt, current: Pt) {
    let end = effective_endpoint(start, current, SHIFT_PRESSED);
    RESULT_DIST = Some(distance(start, end));
    PostQuitMessage(0);
}

unsafe extern "system" fn wnd_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    unsafe {
        match msg {
            WM_MOUSEMOVE => {
                let cx = ((lparam.0 as i32) & 0xFFFF) as i16 as i32;
                let cy = (((lparam.0 as i32) >> 16) & 0xFFFF) as i16 as i32;
                let mut pt = POINT { x: cx, y: cy };
                let _ = ClientToScreen(hwnd, &mut pt);
                CURRENT = Pt { x: pt.x, y: pt.y };

                if DRAG_MODE
                    && (wparam.0 & 0x0001) != 0
                    && START.is_none()
                {
                    START = Some(CURRENT);
                }
                render();
                LRESULT(0)
            }
            WM_LBUTTONDOWN => {
                let cx = ((lparam.0 as i32) & 0xFFFF) as i16 as i32;
                let cy = (((lparam.0 as i32) >> 16) & 0xFFFF) as i16 as i32;
                let mut pt = POINT { x: cx, y: cy };
                let _ = ClientToScreen(hwnd, &mut pt);
                CURRENT = Pt { x: pt.x, y: pt.y };

                if DRAG_MODE {
                    if START.is_none() {
                        START = Some(CURRENT);
                    }
                } else if let Some(start) = START {
                    finish_with_distance(start, CURRENT);
                } else {
                    START = Some(CURRENT);
                }
                render();
                LRESULT(0)
            }
            WM_LBUTTONUP => {
                if DRAG_MODE {
                    if let Some(start) = START {
                        let cx = ((lparam.0 as i32) & 0xFFFF) as i16 as i32;
                        let cy = (((lparam.0 as i32) >> 16) & 0xFFFF) as i16 as i32;
                        let mut pt = POINT { x: cx, y: cy };
                        let _ = ClientToScreen(hwnd, &mut pt);
                        CURRENT = Pt { x: pt.x, y: pt.y };
                        finish_with_distance(start, CURRENT);
                    }
                }
                LRESULT(0)
            }
            WM_RBUTTONDOWN => {
                // Right click cancels
                CANCELLED = true;
                PostQuitMessage(0);
                LRESULT(0)
            }
            WM_TIMER => {
                if wparam.0 == SHIFT_POLL_TIMER_ID {
                    // Fallback poll for shift state (in case hook misses an event)
                    let s = GetKeyState(VK_SHIFT.0 as i32) < 0;
                    if s != SHIFT_PRESSED {
                        SHIFT_PRESSED = s;
                        render();
                    }
                } else if wparam.0 == TIMER_ID {
                    // Periodic redraw to keep coords fresh even if mouse stops
                    let mut pt = POINT::default();
                    let _ = GetCursorPos(&mut pt);
                    if pt.x != CURRENT.x || pt.y != CURRENT.y {
                        CURRENT = Pt { x: pt.x, y: pt.y };
                        render();
                    }
                }
                LRESULT(0)
            }
            WM_SETCURSOR => {
                if START.is_some() {
                    let _ = SetCursor(None);
                } else {
                    let cur = LoadCursorW(None, IDC_CROSS).unwrap_or_default();
                    let _ = SetCursor(Some(cur));
                }
                LRESULT(1)
            }
            WM_DESTROY => {
                PostQuitMessage(0);
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }
}

#[raycast]
fn measure_distance(drag_mode: bool) -> std::result::Result<Option<String>, String> {
    unsafe {
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

        let gdip_input = GdiplusStartupInput {
            GdiplusVersion: 1,
            ..Default::default()
        };
        GdiplusStartup(&mut GDIP_TOKEN, &gdip_input, std::ptr::null_mut());
        // Ensure GdiplusShutdown runs on any return path (normal or `?`).
        let _gdip_guard = GdiplusGuard { token: GDIP_TOKEN };

        DRAG_MODE = drag_mode;
        START = None;
        RESULT_DIST = None;
        CANCELLED = false;
        SHIFT_PRESSED = false;

        SX = GetSystemMetrics(SM_XVIRTUALSCREEN);
        SY = GetSystemMetrics(SM_YVIRTUALSCREEN);
        SW = GetSystemMetrics(SM_CXVIRTUALSCREEN);
        SH = GetSystemMetrics(SM_CYVIRTUALSCREEN);

        let class_name = w!("RaycastRulerWindow");
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
        // Ensure the class is unregistered on any return path (normal or `?`).
        let _class_guard = ClassGuard { name: class_name, hinstance };

        let hwnd = CreateWindowExW(
            WS_EX_TOPMOST | WS_EX_LAYERED | WS_EX_TOOLWINDOW,
            class_name,
            w!(""),
            WS_POPUP,
            SX,
            SY,
            SW,
            SH,
            None,
            None,
            Some(hinstance),
            None,
        )
        .map_err(|e| e.to_string())?;
        HWND_RULER = hwnd;

        // Create DIB section for layered window backing
        let hdc_screen = GetDC(None);
        let bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: SW,
                biHeight: -SH, // top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0 as u32,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut bits: *mut std::ffi::c_void = std::ptr::null_mut();
        let dib_result =
            CreateDIBSection(Some(hdc_screen), &bi, DIB_RGB_COLORS, &mut bits, None, 0);
        DIB_DC = CreateCompatibleDC(Some(hdc_screen));
        ReleaseDC(None, hdc_screen); // always release before any early return
        DIB_BMP = dib_result.map_err(|e| {
            let _ = DeleteDC(DIB_DC);
            let _ = DestroyWindow(hwnd);
            e.to_string()
        })?;
        DIB_BITS = bits as *mut u8;
        DIB_OLD = SelectObject(DIB_DC, DIB_BMP.into());

        // Exclude from screen capture to avoid feedback if user records
        let _ = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);

        // Initial cursor position
        let mut pt = POINT::default();
        let _ = GetCursorPos(&mut pt);
        CURRENT = Pt { x: pt.x, y: pt.y };

        render();

        let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);

        // Install keyboard hook for ESC / Shift
        let hmod = GetModuleHandleW(None).unwrap_or_default();
        KB_HOOK = SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(kb_hook),
            Some(HINSTANCE(hmod.0)),
            0,
        )
        .unwrap_or_default();

        let _ = SetTimer(Some(hwnd), TIMER_ID, TIMER_INTERVAL_MS, None);
        let _ = SetTimer(Some(hwnd), SHIFT_POLL_TIMER_ID, SHIFT_POLL_MS, None);

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        let _ = KillTimer(Some(hwnd), TIMER_ID);
        let _ = KillTimer(Some(hwnd), SHIFT_POLL_TIMER_ID);
        if KB_HOOK.0 as *mut _ as usize != 0 {
            let _ = UnhookWindowsHookEx(KB_HOOK);
        }
        SelectObject(DIB_DC, DIB_OLD);
        let _ = DeleteObject(DIB_BMP.into());
        let _ = DeleteDC(DIB_DC);
        let _ = DestroyWindow(hwnd);
        // Class is unregistered by `_class_guard` and GDI+ by `_gdip_guard` on scope exit.

        if CANCELLED {
            return Ok(None);
        }
        Ok(RESULT_DIST.map(|d| d.to_string()))
    }
}
