#![cfg_attr(windows, windows_subsystem = "windows")]

use raycast_rust_macros::raycast;

#[cfg(windows)]
mod mixer;

#[raycast]
fn mixer_request(support_path: String, request: String) -> Result<String, String> {
    #[cfg(windows)]
    {
        mixer::request(&support_path, &request)
    }
    #[cfg(not(windows))]
    {
        let _ = (support_path, request);
        Err("Windows only".into())
    }
}

#[raycast]
fn mixer_worker(support_path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        mixer::run(&support_path)
    }
    #[cfg(not(windows))]
    {
        let _ = support_path;
        Err("Windows only".into())
    }
}
