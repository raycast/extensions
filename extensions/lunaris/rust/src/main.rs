use image::{imageops, load_from_memory, GenericImageView, ImageFormat};
use raycast_rust_macros::raycast;

#[raycast]
pub async fn generate_character_card(
    _id: String,
    avatar_filename: String,
    bg_path: String,
    output_path: String,
) -> Result<String, String> {
    let base_url = "https://api.lunaris.moe/data/assets/avataricon/";
    let full_url = format!("{}{}", base_url, avatar_filename);

    // 1. Fetch Remote Avatar
    let client = reqwest::Client::new();
    let response = client
        .get(&full_url)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Buffer error: {}", e))?;

    let target_width = 96;
    let target_height = 96;

    let raw_bg = image::open(&bg_path).map_err(|_| format!("Missing BG: {}", bg_path))?;
    let mut canvas =
        raw_bg.resize_exact(target_width, target_height, imageops::FilterType::Lanczos3);

    let (w, h) = canvas.dimensions();

    let avatar = load_from_memory(&bytes).map_err(|e| format!("Decode error: {}", e))?;
    let target_h = (h as f32) as u32;
    let scaled_avatar = avatar.resize(w, target_h, imageops::FilterType::Lanczos3);
    let x_av = (w as i32 - scaled_avatar.width() as i32) / 2;
    let y_av = (h as i32 - scaled_avatar.height() as i32) / 2;
    imageops::overlay(&mut canvas, &scaled_avatar, x_av as i64, y_av as i64);

    canvas
        .save_with_format(&output_path, ImageFormat::WebP)
        .map_err(|e| format!("Save error: {}", e))?;

    Ok(output_path)
}
