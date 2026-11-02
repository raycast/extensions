#![cfg_attr(windows, windows_subsystem = "windows")]

use raycast_rust_macros::raycast;

#[cfg(windows)]
mod browser;

#[raycast]
fn switch_tab(executable: String, title: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        browser::switch_tab(&executable, &title)
    }
    #[cfg(not(windows))]
    {
        let _ = (executable, title);
        Err("Windows only".into())
    }
}

#[raycast]
fn new_tab(executable: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        browser::new_tab(&executable)
    }
    #[cfg(not(windows))]
    {
        let _ = executable;
        Err("Windows only".into())
    }
}
