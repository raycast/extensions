use std::{
    collections::VecDeque,
    mem::size_of,
    thread,
    time::{Duration, Instant},
};
use windows::{
    core::PWSTR,
    Win32::{
        Foundation::{CloseHandle, BOOL, HWND, LPARAM},
        System::{
            Com::{
                CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
                COINIT_MULTITHREADED,
            },
            Threading::{
                OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
                PROCESS_QUERY_LIMITED_INFORMATION,
            },
        },
        UI::{
            Accessibility::*,
            Input::KeyboardAndMouse::{
                GetAsyncKeyState, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
                KEYEVENTF_KEYUP, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
            },
            WindowsAndMessaging::*,
        },
    },
};

fn error(error: windows::core::Error) -> String {
    error.to_string()
}

struct Com;
impl Com {
    fn initialize() -> Result<Self, String> {
        unsafe {
            CoInitializeEx(None, COINIT_MULTITHREADED)
                .ok()
                .map_err(error)?;
        }
        Ok(Self)
    }
}
impl Drop for Com {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}

struct WindowSearch {
    executable: String,
    windows: Vec<HWND>,
}

unsafe extern "system" fn collect_window(hwnd: HWND, data: LPARAM) -> BOOL {
    let search = &mut *(data.0 as *mut WindowSearch);
    if !IsWindowVisible(hwnd).as_bool() || GetWindowTextLengthW(hwnd) == 0 {
        return BOOL(1);
    }
    let mut class = [0u16; 64];
    let length = GetClassNameW(hwnd, &mut class);
    if String::from_utf16_lossy(&class[..length.max(0) as usize]) != "Chrome_WidgetWin_1" {
        return BOOL(1);
    }
    let mut pid = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    if let Ok(process) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
        let mut path = vec![0u16; 32768];
        let mut length = path.len() as u32;
        let result = QueryFullProcessImageNameW(
            process,
            PROCESS_NAME_WIN32,
            PWSTR(path.as_mut_ptr()),
            &mut length,
        );
        let _ = CloseHandle(process);
        if result.is_ok()
            && normalize_path(&String::from_utf16_lossy(&path[..length as usize]))
                == search.executable
        {
            search.windows.push(hwnd);
        }
    }
    BOOL(1)
}

fn normalize_path(path: &str) -> String {
    path.trim_start_matches(r"\\?\")
        .replace('/', "\\")
        .to_lowercase()
}

fn browser_windows(executable: &str) -> Result<Vec<HWND>, String> {
    let mut search = WindowSearch {
        executable: normalize_path(executable),
        windows: Vec::new(),
    };
    unsafe {
        EnumWindows(Some(collect_window), LPARAM(&mut search as *mut _ as isize)).map_err(error)?;
    }
    Ok(search.windows)
}

fn key(key: u16, up: bool) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY(key),
                dwFlags: if up {
                    KEYEVENTF_KEYUP
                } else {
                    Default::default()
                },
                ..Default::default()
            },
        },
    }
}

fn send(inputs: &[INPUT]) -> Result<(), String> {
    if unsafe { SendInput(inputs, size_of::<INPUT>() as i32) } != inputs.len() as u32 {
        return Err("Windows refused the keyboard input.".into());
    }
    Ok(())
}

fn focus(hwnd: HWND) -> Result<(), String> {
    unsafe {
        if IsIconic(hwnd).as_bool() {
            let mut placement = WINDOWPLACEMENT {
                length: size_of::<WINDOWPLACEMENT>() as u32,
                ..Default::default()
            };
            GetWindowPlacement(hwnd, &mut placement).map_err(error)?;
            let mode = if placement.flags.contains(WPF_RESTORETOMAXIMIZED) {
                SW_SHOWMAXIMIZED
            } else {
                SW_RESTORE
            };
            let _ = ShowWindowAsync(hwnd, mode);
        }
        if GetForegroundWindow() == hwnd && !IsIconic(hwnd).as_bool() {
            return Ok(());
        }
        let _ = SetForegroundWindow(hwnd);
        if GetForegroundWindow() != hwnd {
            send(&[key(VK_MENU.0, false), key(VK_MENU.0, true)])?;
            let _ = SetForegroundWindow(hwnd);
        }
        let deadline = Instant::now() + Duration::from_millis(250);
        while GetForegroundWindow() != hwnd || IsIconic(hwnd).as_bool() {
            if Instant::now() >= deadline {
                return Err("Windows did not allow Brave to become the foreground window.".into());
            }
            thread::sleep(Duration::from_millis(10));
        }
    }
    Ok(())
}

fn title_matches(name: &str, target: &str) -> bool {
    let name = name.trim();
    if name.eq_ignore_ascii_case(target.trim()) {
        return true;
    }
    [" - Memory usage - ", " - Inactive tab - "]
        .iter()
        .any(|suffix| {
            name.rsplit_once(suffix)
                .is_some_and(|(title, _)| title.trim().eq_ignore_ascii_case(target.trim()))
        })
}

unsafe fn find_tab(
    automation: &IUIAutomation,
    hwnd: HWND,
    title: Option<&str>,
) -> Result<Option<IUIAutomationElement>, String> {
    let root = automation.ElementFromHandle(hwnd).map_err(error)?;
    let cache = automation.CreateCacheRequest().map_err(error)?;
    cache
        .AddProperty(UIA_ControlTypePropertyId)
        .map_err(error)?;
    cache.AddProperty(UIA_NamePropertyId).map_err(error)?;
    cache
        .AddProperty(UIA_AutomationIdPropertyId)
        .map_err(error)?;
    cache.SetTreeScope(TreeScope_Element).map_err(error)?;
    let condition = automation.CreateTrueCondition().map_err(error)?;
    let mut queue = VecDeque::from([root]);
    let mut visited = 0;
    while let Some(parent) = queue.pop_front() {
        visited += 1;
        if visited > 1024 {
            return Err("Brave's browser controls exceeded the accessibility search limit.".into());
        }
        let children = match parent.FindAllBuildCache(TreeScope_Children, &condition, &cache) {
            Ok(children) => children,
            Err(_) => continue,
        };
        for index in 0..children.Length().map_err(error)? {
            let element = children.GetElement(index).map_err(error)?;
            let kind = element.CachedControlType().map_err(error)?;
            if kind == UIA_DocumentControlTypeId {
                continue;
            }
            if kind == UIA_TabItemControlTypeId {
                let matches = match title {
                    Some(title) => {
                        title_matches(&element.CachedName().map_err(error)?.to_string(), title)
                    }
                    None => true,
                };
                if element.CachedAutomationId().map_err(error)? == "view_20" && matches {
                    return Ok(Some(element));
                }
                continue;
            }
            queue.push_back(element);
        }
    }
    Ok(None)
}

pub fn switch_tab(executable: &str, title: &str) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("This tab has no title. Refresh the list and try again.".into());
    }
    let _com = Com::initialize()?;
    let automation: IUIAutomation =
        unsafe { CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).map_err(error)? };
    for hwnd in browser_windows(executable)? {
        if let Some(tab) = unsafe { find_tab(&automation, hwnd, Some(title))? } {
            focus(hwnd)?;
            let selection: IUIAutomationSelectionItemPattern = unsafe {
                tab.GetCurrentPatternAs(UIA_SelectionItemPatternId)
                    .map_err(error)?
            };
            unsafe {
                selection.Select().map_err(error)?;
                if !selection.CurrentIsSelected().map_err(error)?.as_bool() {
                    return Err("Brave did not select the requested tab.".into());
                }
            }
            return Ok(());
        }
    }
    Err(
        "The tab was not found in the selected Brave installation. Refresh the list and try again."
            .into(),
    )
}

fn modifiers_pressed() -> bool {
    [VK_CONTROL, VK_SHIFT, VK_MENU, VK_LWIN, VK_RWIN]
        .iter()
        .any(|modifier| unsafe { GetAsyncKeyState(modifier.0 as i32) < 0 })
}

pub fn new_tab(executable: &str) -> Result<bool, String> {
    let Some(hwnd) = browser_windows(executable)?.into_iter().next() else {
        return Ok(false);
    };
    if modifiers_pressed() {
        return Ok(false);
    }
    focus(hwnd)?;
    if modifiers_pressed() {
        return Ok(false);
    }
    unsafe {
        if GetForegroundWindow() != hwnd {
            return Err("Brave lost focus before opening the new tab.".into());
        }
    }
    let result = send(&[
        key(VK_CONTROL.0, false),
        key(0x54, false),
        key(0x54, true),
        key(VK_CONTROL.0, true),
    ]);
    if result.is_err() {
        let _ = send(&[key(0x54, true), key(VK_CONTROL.0, true)]);
    }
    result?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore = "requires a running Brave window and temporarily changes its show state"]
    fn live_switch_preserves_window_placement() {
        let executable = std::env::var("RAYCAST_BRAVE_EXE").expect("Set RAYCAST_BRAVE_EXE");
        let hwnd = browser_windows(&executable)
            .unwrap()
            .into_iter()
            .next()
            .expect("Open Brave first");
        unsafe {
            let mut original = WINDOWPLACEMENT {
                length: size_of::<WINDOWPLACEMENT>() as u32,
                ..Default::default()
            };
            GetWindowPlacement(hwnd, &mut original).unwrap();
            struct Restore(HWND, WINDOWPLACEMENT);
            impl Drop for Restore {
                fn drop(&mut self) {
                    unsafe {
                        let _ = SetWindowPlacement(self.0, &self.1);
                    }
                }
            }
            let _restore = Restore(hwnd, original);
            let probe = CreateWindowExW(
                Default::default(),
                windows::core::w!("STATIC"),
                windows::core::w!("Brave focus regression test"),
                WS_OVERLAPPEDWINDOW,
                10,
                10,
                320,
                100,
                None,
                None,
                None,
                None,
            )
            .unwrap();
            struct Probe(HWND);
            impl Drop for Probe {
                fn drop(&mut self) {
                    unsafe {
                        let _ = DestroyWindow(self.0);
                    }
                }
            }
            let _probe = Probe(probe);
            let mut title = [0u16; 4096];
            let length = GetWindowTextW(hwnd, &mut title);
            let title = String::from_utf16_lossy(&title[..length as usize]);
            let title = title
                .strip_suffix(" - Brave")
                .expect("Expected a regular Brave window");
            for mode in [SW_SHOWNORMAL, SW_SHOWMAXIMIZED] {
                let _ = ShowWindow(hwnd, mode);
                let mut before = WINDOWPLACEMENT {
                    length: size_of::<WINDOWPLACEMENT>() as u32,
                    ..Default::default()
                };
                GetWindowPlacement(hwnd, &mut before).unwrap();
                for repetition in 0..2 {
                    if repetition == 0 {
                        let _ = ShowWindow(probe, SW_SHOW);
                        focus(probe).unwrap();
                        assert_eq!(GetForegroundWindow(), probe);
                    }
                    let start = Instant::now();
                    switch_tab(&executable, title).unwrap();
                    let mut after = WINDOWPLACEMENT {
                        length: size_of::<WINDOWPLACEMENT>() as u32,
                        ..Default::default()
                    };
                    GetWindowPlacement(hwnd, &mut after).unwrap();
                    assert_eq!(before.showCmd, after.showCmd);
                    assert_eq!(before.rcNormalPosition, after.rcNormalPosition);
                    assert_eq!(GetForegroundWindow(), hwnd);
                    println!(
                        "mode={} repetition={} switch={}ms",
                        mode.0,
                        repetition,
                        start.elapsed().as_millis()
                    );
                }
                let _ = ShowWindow(hwnd, SW_MINIMIZE);
                assert!(IsIconic(hwnd).as_bool());
                switch_tab(&executable, title).unwrap();
                let mut after = WINDOWPLACEMENT {
                    length: size_of::<WINDOWPLACEMENT>() as u32,
                    ..Default::default()
                };
                GetWindowPlacement(hwnd, &mut after).unwrap();
                assert_eq!(before.showCmd, after.showCmd);
                assert_eq!(before.rcNormalPosition, after.rcNormalPosition);
                assert!(!IsIconic(hwnd).as_bool());
            }
            let _com = Com::initialize().unwrap();
            let automation: IUIAutomation =
                CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).unwrap();
            let tab = find_tab(&automation, hwnd, None).unwrap().unwrap();
            let other_title = tab.CachedName().unwrap().to_string();
            let start = Instant::now();
            switch_tab(&executable, &other_title).unwrap();
            let selection: IUIAutomationSelectionItemPattern =
                tab.GetCurrentPatternAs(UIA_SelectionItemPatternId).unwrap();
            assert!(selection.CurrentIsSelected().unwrap().as_bool());
            println!("select-first-tab={}ms", start.elapsed().as_millis());
            switch_tab(&executable, title).unwrap();
        }
    }

    #[test]
    fn titles_handle_metadata_without_substring_matches() {
        assert!(title_matches("Google - Memory usage - 45 MB", "Google"));
        assert!(title_matches(
            "Page - Inactive tab - 10 MB freed up",
            "Page"
        ));
        assert!(title_matches("  Page  ", "Page"));
        assert!(!title_matches("Google Docs", "Google"));
        assert!(!title_matches(
            "Other Google - Memory usage - 45 MB",
            "Google"
        ));
    }
    #[test]
    fn executable_matching_normalizes_windows_paths() {
        assert_eq!(
            normalize_path(r"\\?\C:\Brave\brave.exe"),
            normalize_path("c:/brave/brave.exe")
        );
        assert_ne!(
            normalize_path(r"C:\Brave\brave.exe"),
            normalize_path(r"D:\Brave\brave.exe")
        );
    }
}
