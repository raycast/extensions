use image::GenericImageView;
use raycast_rust_macros::raycast;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
struct FinalColor {
    hex: String,
    red: i32,
    green: i32,
    blue: i32,
    area: f64,
    hue: f64,
    saturation: f64,
    lightness: f64,
    intensity: f64,
}

/// Quantize a value (0.0–1.0) to the nearest 5% step, matching the Swift implementation.
fn quantize(value: f64) -> f64 {
    (value * 20.0).round() / 20.0
}

/// Euclidean colour distance in normalised RGB space (each channel 0.0–1.0).
fn color_distance(r1: f64, g1: f64, b1: f64, r2: f64, g2: f64, b2: f64) -> f64 {
    let dr = r1 - r2;
    let dg = g1 - g2;
    let db = b1 - b2;
    (dr * dr + dg * dg + db * db).sqrt()
}

/// Convert normalised RGB to HSB (hue 0–360, saturation 0–100, brightness 0–100).
/// This mirrors NSColor.getHue(_:saturation:brightness:alpha:) used in the Swift version.
fn rgb_to_hsb(r: f64, g: f64, b: f64) -> (f64, f64, f64) {
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let d = max - min;

    // Brightness (value)
    let v = max;

    // Saturation
    let s = if max == 0.0 { 0.0 } else { d / max };

    // Hue
    let h = if d.abs() < f64::EPSILON {
        0.0
    } else if (max - r).abs() < f64::EPSILON {
        let mut h = (g - b) / d;
        if g < b {
            h += 6.0;
        }
        h * 60.0
    } else if (max - g).abs() < f64::EPSILON {
        ((b - r) / d + 2.0) * 60.0
    } else {
        ((r - g) / d + 4.0) * 60.0
    };

    (h, s * 100.0, v * 100.0)
}

/// Filter out colours that are too similar (Euclidean distance < threshold in 0‑1 RGB space).
fn filter_similar_colors(
    sorted: &[((u8, u8, u8), u32)],
    threshold: f64,
) -> Vec<((u8, u8, u8), u32)> {
    let mut filtered: Vec<((u8, u8, u8), u32)> = Vec::new();

    for &(color, count) in sorted {
        let is_similar = filtered.iter().any(|&(existing, _)| {
            color_distance(
                color.0 as f64 / 255.0,
                color.1 as f64 / 255.0,
                color.2 as f64 / 255.0,
                existing.0 as f64 / 255.0,
                existing.1 as f64 / 255.0,
                existing.2 as f64 / 255.0,
            ) < threshold
        });
        if !is_similar {
            filtered.push((color, count));
        }
    }

    filtered
}

#[raycast]
fn extract_color(file_path: String, count: i32, dominant_only: bool) -> Result<Vec<FinalColor>, String> {
    // Load image from disk
    let img = image::open(&file_path).map_err(|e| format!("Failed to load image: {}", e))?;

    // Resize if the image exceeds 1 million pixels (matches Swift logic)
    let (orig_w, orig_h) = img.dimensions();
    let img = if (orig_w as u64 * orig_h as u64) > 1_000_000 {
        let scale = (1000.0_f64 / orig_w as f64).min(1000.0 / orig_h as f64);
        if scale < 1.0 {
            let new_w = (orig_w as f64 * scale) as u32;
            let new_h = (orig_h as f64 * scale) as u32;
            img.resize_exact(new_w, new_h, image::imageops::FilterType::Lanczos3)
        } else {
            img
        }
    } else {
        img
    };

    let (width, height) = img.dimensions();
    let total_pixels = (width as u64 * height as u64) as usize;

    // Adaptive sample step – same formula as Swift: max(1, min(width, height) / 100)
    let sample_step = 1.max(width.min(height) / 100) as usize;

    // Count quantised colours
    let mut color_counts: HashMap<(u8, u8, u8), u32> = HashMap::new();

    for x in (0..width as usize).step_by(sample_step) {
        for y in (0..height as usize).step_by(sample_step) {
            let pixel = img.get_pixel(x as u32, y as u32);
            let r = quantize(pixel[0] as f64 / 255.0);
            let g = quantize(pixel[1] as f64 / 255.0);
            let b = quantize(pixel[2] as f64 / 255.0);

            let qr = (r * 255.0).round() as u8;
            let qg = (g * 255.0).round() as u8;
            let qb = (b * 255.0).round() as u8;

            *color_counts.entry((qr, qg, qb)).or_insert(0) += 1;
        }
    }

    // Sort by count descending
    let mut sorted: Vec<_> = color_counts.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1));

    // Filter similar colours (threshold 0.2, matching Swift)
    let filtered = filter_similar_colors(&sorted, 0.2);

    // Optionally keep only dominant colours (> 1 % of total pixels)
    let significant_threshold = (total_pixels as f64 * 0.01) as u32;
    let working: Vec<_> = if dominant_only {
        filtered
            .into_iter()
            .filter(|&(_, c)| c > significant_threshold)
            .collect()
    } else {
        filtered
    };

    // Take top N and convert to FinalColor
    let results: Vec<FinalColor> = working
        .into_iter()
        .take(count as usize)
        .map(|((r, g, b), cnt)| {
            let rf = r as f64 / 255.0;
            let gf = g as f64 / 255.0;
            let bf = b as f64 / 255.0;

            // HSB – mirrors Swift's getHue(saturation:brightness:)
            let (h, s, brightness) = rgb_to_hsb(rf, gf, bf);

            FinalColor {
                hex: format!("#{:02X}{:02X}{:02X}", r, g, b),
                red: r as i32,
                green: g as i32,
                blue: b as i32,
                area: (cnt as f64 / total_pixels as f64) * 100.0,
                hue: h,
                saturation: s,
                lightness: brightness, // Swift names this field "lightness" but uses HSB brightness
                intensity: ((rf + gf + bf) / 3.0) * 100.0,
            }
        })
        .collect();

    Ok(results)
}
