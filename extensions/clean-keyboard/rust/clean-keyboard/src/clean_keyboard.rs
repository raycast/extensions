use std::mem;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use raycast_rust_macros::raycast;

use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
    VIRTUAL_KEY,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, PeekMessageW, SetWindowsHookExW, TranslateMessage,
    UnhookWindowsHookEx, HHOOK, KBDLLHOOKSTRUCT, MSG, PM_REMOVE, WH_KEYBOARD_LL,
    WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

const VK_LCONTROL: u32 = 0xA2;
const VK_RCONTROL: u32 = 0xA3;
const VK_U: u32 = 0x55;

static IS_LOCKED: AtomicBool = AtomicBool::new(false);
static CTRL_DOWN: AtomicBool = AtomicBool::new(false);
static mut KEYBOARD_HOOK: HHOOK = unsafe { mem::zeroed() };

fn inject_ctrl_u() {
    unsafe {
        let inputs: [INPUT; 4] = [
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(VK_LCONTROL as u16),
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0),
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(VK_U as u16),
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0),
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(VK_U as u16),
                        wScan: 0,
                        dwFlags: KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(VK_LCONTROL as u16),
                        wScan: 0,
                        dwFlags: KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
        ];
        SendInput(&inputs, mem::size_of::<INPUT>() as i32);
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

            if kbd.vkCode == VK_LCONTROL || kbd.vkCode == VK_RCONTROL {
                if is_down { CTRL_DOWN.store(true, Ordering::SeqCst); }
                else if is_up { CTRL_DOWN.store(false, Ordering::SeqCst); }
                return CallNextHookEx(KEYBOARD_HOOK, code, wparam, lparam);
            }

            if IS_LOCKED.load(Ordering::SeqCst) {
                if is_down && kbd.vkCode == VK_U && CTRL_DOWN.load(Ordering::SeqCst) {
                    // Physical or synthetic Ctrl+U — unlock directly
                    IS_LOCKED.store(false, Ordering::SeqCst);
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
        IS_LOCKED.store(true, Ordering::SeqCst);

        let hmod = GetModuleHandleW(None).map_err(|e| e.to_string())?;
        let hinstance = HINSTANCE(hmod.0);

        KEYBOARD_HOOK = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_hook), hinstance, 0)
            .map_err(|e| e.to_string())?;

        if let Some(secs) = duration {
            thread::spawn(move || {
                thread::sleep(Duration::from_secs(secs as u64));
                if IS_LOCKED.load(Ordering::SeqCst) {
                    eprintln!("Timer expired ⏱️");
                    IS_LOCKED.store(false, Ordering::SeqCst);
                }
            });
        }

        let mut msg = MSG::default();
        while IS_LOCKED.load(Ordering::SeqCst) {
            if PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            } else {
                thread::sleep(Duration::from_millis(5));
            }
        }

        let _ = UnhookWindowsHookEx(KEYBOARD_HOOK);
        KEYBOARD_HOOK = mem::zeroed();

        Ok(())
    }
}

#[raycast]
fn stop_handler() -> Result<(), String> {
    // Injects synthetic Ctrl+U — the hook in handler()'s process catches it
    // and sets IS_LOCKED to false, exiting the loop. Same approach as Swift.
    inject_ctrl_u();
    Ok(())
}