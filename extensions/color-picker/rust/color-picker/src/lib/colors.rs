use windows::Win32::Foundation::COLORREF;
use super::constants::*;

/// RGB color components
#[derive(Debug, Clone, Copy)]
pub struct RgbColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl RgbColor {
    /// Create a new RGB color
    pub fn new(r: u8, g: u8, b: u8) -> Self {
        Self { r, g, b }
    }

    /// Extract RGB from COLORREF (format: 0x00BBGGRR)
    pub fn from_colorref(color: COLORREF) -> Self {
        Self {
            r: (color.0 & 0xFF) as u8,
            g: ((color.0 >> 8) & 0xFF) as u8,
            b: ((color.0 >> 16) & 0xFF) as u8,
        }
    }

    /// Convert RGB to ARGB format (0xAARRGGBB)
    pub fn to_argb(&self) -> u32 {
        0xFF000000u32 | ((self.r as u32) << 16) | ((self.g as u32) << 8) | (self.b as u32)
    }

    /// Convert RGB to COLORREF format (0x00BBGGRR)
    pub fn to_colorref(&self) -> COLORREF {
        COLORREF(((self.b as u32) << 16) | ((self.g as u32) << 8) | (self.r as u32))
    }

    /// Format as hex string (#RRGGBB)
    pub fn to_hex_string(&self) -> String {
        format!("#{:02X}{:02X}{:02X}", self.r, self.g, self.b)
    }

    /// Calculate luminance using Rec. 601 standard
    pub fn luminance(&self) -> f64 {
        LUMINANCE_RED_COEFF * self.r as f64
            + LUMINANCE_GREEN_COEFF * self.g as f64
            + LUMINANCE_BLUE_COEFF * self.b as f64
    }

    /// Determine text color (black or white) based on background luminance
    pub fn text_color(&self) -> COLORREF {
        if self.luminance() > LUMINANCE_THRESHOLD {
            COLORREF(COLOR_BLACK_REF)
        } else {
            COLORREF(COLOR_WHITE_REF)
        }
    }
}
