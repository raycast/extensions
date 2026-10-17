#![cfg_attr(windows, windows_subsystem = "windows")]

use raycast_rust_macros::raycast;
use serde::{Deserialize, Serialize};

#[cfg(windows)]
mod worker;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerConfig {
    pub timer_file: String,
    pub worker_id: String,
    pub deadline: u64,
    pub sound_path: String,
    pub speak: bool,
    pub volume: f64,
    pub ring_continuously: bool,
    pub notification_app_id: String,
}

#[raycast]
fn notification_app_id() -> Result<String, String> {
    #[cfg(windows)]
    {
        worker::notification_app_id()
    }
    #[cfg(not(windows))]
    {
        Err("Windows only".into())
    }
}

#[raycast]
fn ensure_timer_worker(config_json: String) -> Result<u32, String> {
    #[cfg(windows)]
    {
        worker::ensure_timer_worker(serde_json::from_str(&config_json).map_err(|e| e.to_string())?)
    }
    #[cfg(not(windows))]
    {
        let _ = config_json;
        Err("Windows timer backend is unavailable on this platform".into())
    }
}

// The worker re-enters the same bundled executable through the official CLI protocol.
#[raycast]
fn timer_worker(config_json: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        worker::run(serde_json::from_str(&config_json).map_err(|e| e.to_string())?)
    }
    #[cfg(not(windows))]
    {
        let _ = config_json;
        Err("Windows only".into())
    }
}

#[raycast]
fn preview_sound(sound_path: String, speak: bool, volume: f64) -> Result<(), String> {
    #[cfg(windows)]
    {
        worker::preview(&sound_path, speak, volume)
    }
    #[cfg(not(windows))]
    {
        let _ = (sound_path, speak, volume);
        Err("Windows only".into())
    }
}

#[raycast]
fn play_preview(sound_path: String, speak: bool, volume: f64, token: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        worker::play_preview(&sound_path, speak, volume, &token)
    }
    #[cfg(not(windows))]
    {
        let _ = (sound_path, speak, volume, token);
        Err("Windows only".into())
    }
}

#[raycast]
fn stop_preview(token: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        worker::stop_preview(&token)
    }
    #[cfg(not(windows))]
    {
        let _ = token;
        Ok(false)
    }
}
