#![cfg_attr(windows, windows_subsystem = "windows")]

use raycast_rust_macros::raycast;

#[cfg(windows)]
mod browser;

#[raycast]
fn switch_tab(executable: String, title: String, reveal_sidebar: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        browser::switch_tab(&executable, &title, reveal_sidebar)
    }
    #[cfg(not(windows))]
    {
        let _ = (executable, title, reveal_sidebar);
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
