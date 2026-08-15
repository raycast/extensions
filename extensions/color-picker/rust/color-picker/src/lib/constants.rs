// Magnification settings
pub const ZOOM: i32 = 11;
pub const ZOOM_MIN: i32 = 11;
pub const ZOOM_MAX: i32 = 22;
// odd number for a center pixel, high value means more pixels captured around the center
pub const CAPTURE_SIZE: i32 = 21; 
pub const LOUPE_SIZE: i32 = CAPTURE_SIZE * ZOOM;

// Border and layout
pub const BORDER_W: i32 = 2;
pub const WINDOW_SIZE: i32 = LOUPE_SIZE + BORDER_W * 2; // 156px
pub const CROSSHAIR_HALF: i32 = ZOOM / 2;

// Preview styling
pub const PREVIEW_GAP: i32 = 6;
pub const PREVIEW_PADDING_H: i32 = 16;
pub const PREVIEW_PADDING_V: i32 = 8;
pub const PREVIEW_CORNER: i32 = 10;
pub const PREVIEW_BORDER: i32 = 1;

// Timer settings
pub const TIMER_ID: usize = 1;
pub const TIMER_INTERVAL_MS: u32 = 8; // ~120 FPS

// Alpha values
pub const ALPHA_OPAQUE: u8 = 255;
pub const ALPHA_TRANSPARENT: u8 = 1;

// Color constants (ARGB format: 0xAARRGGBB)
pub const COLOR_BORDER_ARGB: u32 = 0xFF47474F;
pub const COLOR_BLACK_ARGB: u32 = 0xFF000000;
pub const COLOR_WHITE_ARGB: u32 = 0xFFFFFFFF;

// Color constants (COLORREF format: 0x00BBGGRR)
pub const COLOR_BORDER_REF: u32 = 0x004F4747;
pub const COLOR_BLACK_REF: u32 = 0x00000000;
pub const COLOR_WHITE_REF: u32 = 0x00FFFFFF;

// Luminance threshold for determining text color
pub const LUMINANCE_THRESHOLD: f64 = 128.0;

// Luminance calculation coefficients (Rec. 601 standard)
pub const LUMINANCE_RED_COEFF: f64 = 0.299;
pub const LUMINANCE_GREEN_COEFF: f64 = 0.587;
pub const LUMINANCE_BLUE_COEFF: f64 = 0.114;

// Font settings
pub const FONT_NAME: &str = "Segoe UI";
pub const FONT_HEIGHT: i32 = -20; // negative = character height
pub const FONT_WEIGHT: i32 = 600; // 400=Normal, 500=Medium, 600=SemiBold, 700=Bold
