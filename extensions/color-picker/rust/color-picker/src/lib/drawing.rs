use windows::Win32::{
    Foundation::*,
    Graphics::Gdi::*,
    Graphics::GdiPlus::*,
};
use super::colors::RgbColor;
use super::constants::*;

/// Draw the crosshair around the center pixel
pub unsafe fn draw_crosshair(hdc: HDC, window_size: i32, crosshair_half: i32, zoom: i32) {
    let center = window_size / 2;
    let cross_left = center - crosshair_half;
    let cross_top = center - crosshair_half;

    // Outer dark rect (border of the selected pixel)
    let dark_pen = CreatePen(PS_SOLID, 2, COLORREF(COLOR_BLACK_REF));
    let old_pen = SelectObject(hdc, dark_pen.into());
    let null_brush = GetStockObject(NULL_BRUSH);
    let old_brush = SelectObject(hdc, null_brush);
    let _ = Rectangle(
        hdc,
        cross_left - 1,
        cross_top - 1,
        cross_left + zoom + 1,
        cross_top + zoom + 1,
    );

    // Inner white rect
    let white_pen = CreatePen(PS_SOLID, 1, COLORREF(COLOR_WHITE_REF));
    SelectObject(hdc, white_pen.into());
    let _ = Rectangle(hdc, cross_left, cross_top, cross_left + zoom, cross_top + zoom);

    SelectObject(hdc, old_pen);
    SelectObject(hdc, old_brush);
    let _ = DeleteObject(dark_pen.into());
    let _ = DeleteObject(white_pen.into());
}

/// Draw circular border ring using GDI+ for anti-aliasing
pub unsafe fn draw_border_ring(hdc: HDC, window_size: i32) {
    let mut graphics: *mut GpGraphics = std::ptr::null_mut();
    GdipCreateFromHDC(hdc, &mut graphics);
    GdipSetSmoothingMode(graphics, SmoothingModeAntiAlias);

    let mut border_pen: *mut GpPen = std::ptr::null_mut();
    GdipCreatePen1(COLOR_BORDER_ARGB, BORDER_W as f32, Unit(2), &mut border_pen);

    let circle_x = BORDER_W as f32 / 2.0;
    let circle_y = BORDER_W as f32 / 2.0;
    let circle_size = window_size as f32 - BORDER_W as f32;
    GdipDrawEllipse(graphics, border_pen, circle_x, circle_y, circle_size, circle_size);

    GdipDeletePen(border_pen);
    GdipDeleteGraphics(graphics);
}

/// Create a rounded rectangle path for GDI+
pub unsafe fn create_rounded_rect_path(rect: &RECT) -> *mut GpPath {
    let mut path: *mut GpPath = std::ptr::null_mut();
    GdipCreatePath(FillModeAlternate, &mut path);

    let rx = rect.left as f32;
    let ry = rect.top as f32;
    let rw = (rect.right - rect.left) as f32;
    let rh = (rect.bottom - rect.top) as f32;
    let corner = PREVIEW_CORNER as f32;
    let diameter = corner * 2.0;

    // Build rounded rectangle path
    GdipAddPathArc(path, rx, ry, diameter, diameter, 180.0, 90.0);
    GdipAddPathArc(path, rx + rw - diameter, ry, diameter, diameter, 270.0, 90.0);
    GdipAddPathArc(path, rx + rw - diameter, ry + rh - diameter, diameter, diameter, 0.0, 90.0);
    GdipAddPathArc(path, rx, ry + rh - diameter, diameter, diameter, 90.0, 90.0);
    GdipClosePathFigure(path);

    path
}

/// Draw the color preview rectangle with rounded corners
pub unsafe fn draw_preview_rect(hdc: HDC, rect: &RECT, color: &RgbColor) {
    let mut graphics: *mut GpGraphics = std::ptr::null_mut();
    GdipCreateFromHDC(hdc, &mut graphics);
    GdipSetSmoothingMode(graphics, SmoothingModeAntiAlias);

    let path = create_rounded_rect_path(rect);

    // Fill the rounded rect
    let fill_argb = color.to_argb();
    let mut fill_brush: *mut GpSolidFill = std::ptr::null_mut();
    GdipCreateSolidFill(fill_argb, &mut fill_brush);
    GdipFillPath(graphics, fill_brush as *mut _, path);
    GdipDeleteBrush(fill_brush as *mut _);

    // Draw border around the rounded rect
    let mut rect_pen: *mut GpPen = std::ptr::null_mut();
    GdipCreatePen1(COLOR_BORDER_ARGB, 1.0, Unit(2), &mut rect_pen);
    GdipDrawPath(graphics, rect_pen, path);
    GdipDeletePen(rect_pen);

    GdipDeletePath(path);
    GdipDeleteGraphics(graphics);
}

/// Create a Segoe UI font with ClearType anti-aliasing
pub unsafe fn create_ui_font() -> HFONT {
    let font_name: Vec<u16> = format!("{}\0", FONT_NAME).encode_utf16().collect();
    CreateFontW(
        FONT_HEIGHT,
        0,                                  // Width (0 = default)
        0,                                  // Escapement
        0,                                  // Orientation
        super::constants::FONT_WEIGHT,     // Weight
        0,                      // Italic
        0,                      // Underline
        0,                      // StrikeOut
        DEFAULT_CHARSET,
        OUT_DEFAULT_PRECIS,
        CLIP_DEFAULT_PRECIS,
        CLEARTYPE_QUALITY,      // Enable ClearType anti-aliasing
        0,                      // Pitch and family
        windows::core::PCWSTR(font_name.as_ptr()),
    )
}

/// Update window region to combine circle and rounded rectangle
pub unsafe fn update_window_region(hwnd: HWND, preview_rect: &RECT, window_size: i32) {
    let circle_rgn = CreateEllipticRgn(0, 0, window_size, window_size);
    let rect_rgn = CreateRoundRectRgn(
        preview_rect.left - PREVIEW_BORDER,
        preview_rect.top - PREVIEW_BORDER,
        preview_rect.right + PREVIEW_BORDER + 2,
        preview_rect.bottom + PREVIEW_BORDER + 2,
        PREVIEW_CORNER * 2,
        PREVIEW_CORNER * 2,
    );
    CombineRgn(Some(circle_rgn), Some(circle_rgn), Some(rect_rgn), RGN_OR);
    let _ = DeleteObject(rect_rgn.into());
    SetWindowRgn(hwnd, Some(circle_rgn), false);
}
