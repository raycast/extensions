use std::mem;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use std::path::PathBuf;
use std::fs;

use raycast_rust_macros::raycast;

use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, PeekMessageW, SetWindowsHookExW, TranslateMessage,
    UnhookWindowsHookEx, HHOOK, KBDLLHOOKSTRUCT, MSG, PM_REMOVE, WH_KEYBOARD_LL,
    WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

const VK_LCONTROL: u32 = 0xA2;
const VK_RCONTROL: u32 = 0xA3;
const VK_U: u32 = 0x55;

static CTRL_DOWN: AtomicBool = AtomicBool::new(false);
static mut KEYBOARD_HOOK: HHOOK = unsafe { mem::zeroed() };

fn lock_file_path() -> PathBuf {
    // Same directory as the executable
    let mut path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
    path.pop();
    path.push("clean_keyboard.lock");
    path
}

fn is_locked() -> bool {
    lock_file_path().exists()
}

fn set_locked(locked: bool) {
    let path = lock_file_path();
    if locked {
        let _ = fs::write(&path, "locked");
    } else {
        let _ = fs::remove_file(&path);
    }
}

unsafe extern "system" fn keyboard_hook(
    code: i32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    unsafe {
        if code >= 0 {
            let kbd = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
            let is_down = wparam.0 == WM_KEYDOWN as usize || wparam.0 == WM_SYSKEYDOWN as usize;
            let is_up   = wparam.0 == WM_KEYUP as usize   || wparam.0 == WM_SYSKEYUP as usize;

            // Track Ctrl state reliably from within the hook
            if kbd.vkCode == VK_LCONTROL || kbd.vkCode == VK_RCONTROL {
                if is_down { CTRL_DOWN.store(true, Ordering::SeqCst); }
                else if is_up { CTRL_DOWN.store(false, Ordering::SeqCst); }
                return CallNextHookEx(KEYBOARD_HOOK, code, wparam, lparam);
            }

            if is_locked() {
                if is_down && kbd.vkCode == VK_U && CTRL_DOWN.load(Ordering::SeqCst) {
                    // Pass Ctrl+U through to Raycast — it will call stop_handler()
                    return CallNextHookEx(KEYBOARD_HOOK, code, wparam, lparam);
                }
                return LRESULT(1);
            }
        }
        CallNextHookEx(KEYBOARD_HOOK, code, wparam, lparam)
    }
}

#[raycast]
fn handler(duration: Option<i32>) -> Result<(), String> {
    unsafe {
        CTRL_DOWN.store(false, Ordering::SeqCst);
        set_locked(true);

        let hmod = GetModuleHandleW(None).map_err(|e| e.to_string())?;
        let hinstance = HINSTANCE(hmod.0);

        KEYBOARD_HOOK = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_hook), hinstance, 0)
            .map_err(|e| e.to_string())?;

        if let Some(secs) = duration {
            thread::spawn(move || {
                thread::sleep(Duration::from_secs(secs as u64));
                if is_locked() {
                    eprintln!("Timer expired ⏱️");
                    set_locked(false);
                }
            });
        }

        // Pump messages while lock file exists
        let mut msg = MSG::default();
        while is_locked() {
            if PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            } else {
                thread::sleep(Duration::from_millis(5));
            }
        }

        let _ = UnhookWindowsHookEx(KEYBOARD_HOOK);
        KEYBOARD_HOOK = mem::zeroed();
        set_locked(false); // Ensure cleanup even if something went wrong

        Ok(())
    }
}

#[raycast]
fn stop_handler() -> Result<(), String> {
    // Runs in a separate process — deletes the lock file to signal handler() to exit
    set_locked(false);
    Ok(())
}