use std::{
    collections::VecDeque,
    mem::size_of,
    thread,
    time::{Duration, Instant},
};
use windows::{
    core::PWSTR,
    Win32::{
        Foundation::{CloseHandle, BOOL, HWND, LPARAM, WPARAM},
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
                return Err("Windows did not allow Helium to become the foreground window.".into());
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

// Helium's IDC_CTRL_S_SHORTCUT. Only use after the read-only profile check
// confirms vertical layout with the collapse shortcut enabled; otherwise this
// command would mean Save Page. A window command avoids injected keystrokes.
fn toggle_sidebar(hwnd: HWND) -> Result<(), String> {
    let sent = unsafe {
        SendMessageTimeoutW(
            hwnd,
            WM_COMMAND,
            WPARAM(34090),
            LPARAM(0),
            SMTO_ABORTIFHUNG | SMTO_BLOCK,
            1000,
            None,
        )
    };
    if sent.0 == 0 {
        return Err("Helium did not respond to the sidebar command.".into());
    }
    Ok(())
}

struct RevealedSidebar(HWND);

struct WindowInspection {
    hwnd: HWND,
    original: Option<(WINDOWPLACEMENT, HWND)>,
}

impl WindowInspection {
    fn begin(hwnd: HWND) -> Result<Self, String> {
        let original = if unsafe { IsIconic(hwnd).as_bool() } {
            let mut placement = WINDOWPLACEMENT {
                length: size_of::<WINDOWPLACEMENT>() as u32,
                ..Default::default()
            };
            unsafe { GetWindowPlacement(hwnd, &mut placement).map_err(error)? };
            Some((placement, unsafe { GetForegroundWindow() }))
        } else {
            None
        };
        let inspection = Self { hwnd, original };
        if inspection.original.is_some() {
            focus(hwnd)?;
        }
        Ok(inspection)
    }

    fn keep_restored(&mut self) {
        self.original = None;
    }
}

impl Drop for WindowInspection {
    fn drop(&mut self) {
        if let Some((placement, foreground)) = self.original {
            unsafe {
                let was_focused = GetForegroundWindow() == self.hwnd;
                let _ = SetWindowPlacement(self.hwnd, &placement);
                if was_focused {
                    let _ = SetForegroundWindow(foreground);
                }
            }
        }
    }
}

impl RevealedSidebar {
    fn restore(self) -> Result<(), String> {
        let result = toggle_sidebar(self.0);
        std::mem::forget(self);
        result
    }
}

impl Drop for RevealedSidebar {
    fn drop(&mut self) {
        let _ = toggle_sidebar(self.0);
    }
}

fn select_tab(hwnd: HWND, tab: &IUIAutomationElement) -> Result<(), String> {
    focus(hwnd)?;
    let selection: IUIAutomationSelectionItemPattern = unsafe {
        tab.GetCurrentPatternAs(UIA_SelectionItemPatternId)
            .map_err(error)?
    };
    unsafe {
        selection.Select().map_err(error)?;
        if !selection.CurrentIsSelected().map_err(error)?.as_bool() {
            return Err("Helium did not select the requested tab.".into());
        }
    }
    Ok(())
}

fn is_browser_tab(automation_id: &str, in_tab_strip: bool) -> bool {
    in_tab_strip || automation_id == "view_20"
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
        .AddProperty(UIA_IsOffscreenPropertyId)
        .map_err(error)?;
    cache
        .AddProperty(UIA_AutomationIdPropertyId)
        .map_err(error)?;
    cache.SetTreeScope(TreeScope_Element).map_err(error)?;
    let condition = automation.CreateTrueCondition().map_err(error)?;
    let mut queue = VecDeque::from([(root, false)]);
    let mut visited = 0;
    while let Some((parent, in_tab_strip)) = queue.pop_front() {
        visited += 1;
        if visited > 1024 {
            return Err(
                "Helium's browser controls exceeded the accessibility search limit.".into(),
            );
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
                if element.CachedIsOffscreen().map_err(error)?.as_bool() {
                    continue;
                }
                let matches = match title {
                    Some(title) => {
                        title_matches(&element.CachedName().map_err(error)?.to_string(), title)
                    }
                    None => true,
                };
                if is_browser_tab(
                    &element.CachedAutomationId().map_err(error)?.to_string(),
                    in_tab_strip,
                ) && matches
                {
                    return Ok(Some(element));
                }
                continue;
            }
            queue.push_back((element, in_tab_strip || kind == UIA_TabControlTypeId));
        }
    }
    Ok(None)
}

pub fn switch_tab(executable: &str, title: &str, reveal_sidebar: bool) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("This tab has no title. Refresh the list and try again.".into());
    }
    let _com = Com::initialize()?;
    let automation: IUIAutomation =
        unsafe { CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).map_err(error)? };
    let windows = browser_windows(executable)?;
    for &hwnd in &windows {
        if unsafe { find_tab(&automation, hwnd, Some(title))? }.is_some() {
            focus(hwnd)?;
            if let Some(tab) = unsafe { find_tab(&automation, hwnd, Some(title))? } {
                return select_tab(hwnd, &tab);
            }
        }
    }
    for hwnd in windows {
        let mut inspection = WindowInspection::begin(hwnd)?;
        if let Some(tab) = unsafe { find_tab(&automation, hwnd, Some(title))? } {
            select_tab(hwnd, &tab)?;
            inspection.keep_restored();
            return Ok(());
        }
        if !reveal_sidebar {
            continue;
        }
        if unsafe { find_tab(&automation, hwnd, None)? }.is_some() {
            continue;
        }
        toggle_sidebar(hwnd)?;
        let sidebar = RevealedSidebar(hwnd);
        let deadline = Instant::now() + Duration::from_millis(600);
        loop {
            if let Some(tab) = unsafe { find_tab(&automation, hwnd, Some(title))? } {
                select_tab(hwnd, &tab)?;
                sidebar.restore()?;
                // Allow the normal hide animation to settle. Helium may keep an
                // unpinned sidebar revealed while hovered or during its window
                // exit grace period; that does not mean restoring it failed.
                let deadline = Instant::now() + Duration::from_millis(600);
                while unsafe { find_tab(&automation, hwnd, None)? }.is_some() {
                    if Instant::now() >= deadline {
                        break;
                    }
                    thread::sleep(Duration::from_millis(30));
                }
                inspection.keep_restored();
                return Ok(());
            }
            if Instant::now() >= deadline {
                break;
            }
            thread::sleep(Duration::from_millis(30));
        }
        sidebar.restore()?;
    }
    Err(
        "The tab was not found in the selected Helium installation. Refresh the list; if the sidebar is hidden, enable Helium's vertical-tab collapse shortcut or show the sidebar."
            .into(),
    )
}

pub fn new_tab(executable: &str) -> Result<bool, String> {
    let Some(hwnd) = browser_windows(executable)?.into_iter().next() else {
        return Ok(false);
    };
    focus(hwnd)?;
    unsafe {
        for modifier in [VK_CONTROL, VK_SHIFT, VK_MENU, VK_LWIN, VK_RWIN] {
            if GetAsyncKeyState(modifier.0 as i32) < 0 {
                return Err("Release modifier keys and try opening a new tab again.".into());
            }
        }
        if GetForegroundWindow() != hwnd {
            return Err("Helium lost focus before opening the new tab.".into());
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
    fn vertical_tabs_do_not_require_horizontal_tab_ids() {
        assert!(is_browser_tab("", true));
        assert!(is_browser_tab("view_20", false));
        assert!(!is_browser_tab("", false));
        assert!(!is_browser_tab("page-control", false));
    }
    #[test]
    #[ignore = "requires a running Helium window and temporarily changes its show state"]
    fn live_switch_preserves_window_placement() {
        let executable = std::env::var("RAYCAST_HELIUM_EXE").expect("Set RAYCAST_HELIUM_EXE");
        let hwnd = browser_windows(&executable)
            .unwrap()
            .into_iter()
            .find(|hwnd| {
                let Ok(target) = std::env::var("RAYCAST_HELIUM_TEST_TITLE") else {
                    return true;
                };
                let mut title = [0u16; 4096];
                let length = unsafe { GetWindowTextW(*hwnd, &mut title) };
                String::from_utf16_lossy(&title[..length as usize]).contains(&target)
            })
            .expect("Open Helium first");
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
                windows::core::w!("Helium focus regression test"),
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
                .strip_suffix(" - Helium")
                .expect("Expected a regular Helium window");
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
                    switch_tab(&executable, title, true).unwrap();
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
                switch_tab(&executable, title, true).unwrap();
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
            let _sidebar = if find_tab(&automation, hwnd, None).unwrap().is_none() {
                toggle_sidebar(hwnd).unwrap();
                let sidebar = RevealedSidebar(hwnd);
                let deadline = Instant::now() + Duration::from_millis(600);
                while find_tab(&automation, hwnd, None).unwrap().is_none() {
                    assert!(Instant::now() < deadline, "Helium did not reveal its tabs");
                    thread::sleep(Duration::from_millis(30));
                }
                Some(sidebar)
            } else {
                None
            };
            let tab = find_tab(&automation, hwnd, None).unwrap().unwrap();
            let other_title = tab.CachedName().unwrap().to_string();
            let start = Instant::now();
            switch_tab(&executable, &other_title, true).unwrap();
            let selection: IUIAutomationSelectionItemPattern =
                tab.GetCurrentPatternAs(UIA_SelectionItemPatternId).unwrap();
            assert!(selection.CurrentIsSelected().unwrap().as_bool());
            println!("select-first-tab={}ms", start.elapsed().as_millis());
            switch_tab(&executable, title, true).unwrap();
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
            normalize_path(r"\\?\C:\Helium\chrome.exe"),
            normalize_path("c:/helium/chrome.exe")
        );
        assert_ne!(
            normalize_path(r"C:\Helium\chrome.exe"),
            normalize_path(r"D:\Helium\chrome.exe")
        );
    }
}
