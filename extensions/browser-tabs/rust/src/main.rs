//! Native Windows helpers for the Browser Tabs Raycast extension.
//!
//! Windows has no scripting interface comparable to AppleScript, so tabs of running
//! browsers are read through UI Automation. Everything here runs on a dedicated STA
//! thread, which is the apartment model UI Automation expects.

mod favicons;
mod history;
mod sqlite;

use raycast_rust_macros::raycast;
use serde::Serialize;
use std::collections::HashMap;
use windows::core::Interface;
use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM, MAX_PATH};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::System::Ole::SafeArrayDestroy;
use windows::Win32::System::Variant::{VARIANT, VT_I4};
use windows::Win32::UI::Accessibility::{
    CUIAutomation8, IUIAutomation, IUIAutomationElement, IUIAutomationInvokePattern,
    IUIAutomationSelectionItemPattern, IUIAutomationValuePattern, TreeScope_Children,
    UIA_ButtonControlTypeId, UIA_ControlTypePropertyId,
    UIA_DocumentControlTypeId, UIA_InvokePatternId, UIA_IsOffscreenPropertyId, UIA_NamePropertyId,
    UIA_SelectionItemIsSelectedPropertyId,
    UIA_SelectionItemPatternId, UIA_TabItemControlTypeId, UIA_ValuePatternId,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
    VIRTUAL_KEY, VK_CONTROL, VK_W,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetForegroundWindow, GetWindowThreadProcessId, IsIconic, IsWindowVisible,
    SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
};

/// Browsers whose tab strips UI Automation can read. The Gecko based ones are included even
/// though macOS cannot support them, because UI Automation does not care which engine draws
/// the tabs.
const BROWSERS: [(&str, &str); 11] = [
    ("chrome", "Google Chrome"),
    ("msedge", "Microsoft Edge"),
    ("firefox", "Firefox"),
    ("zen", "Zen Browser"),
    ("brave", "Brave"),
    ("vivaldi", "Vivaldi"),
    ("opera", "Opera"),
    ("opera_gx", "Opera GX"),
    ("arc", "Arc"),
    ("dia", "Dia"),
    ("chromium", "Chromium"),
];

/// Suffixes a browser appends to a tab's accessible name that are not part of the page
/// title: what the tab is doing, where it sits in a split view, or that it has been put to
/// sleep to save memory.
const STATE_SUFFIXES: [&str; 5] = [
    " - Audio playing",
    " - Audio muted",
    " - Left view",
    " - Right view",
    " - Sleeping",
];

const MEMORY_MARKERS: [&str; 2] = [" - High memory usage - ", " - Memory usage - "];

#[derive(Serialize)]
pub struct TabInfo {
    pub browser: String,
    pub browser_path: String,
    pub window_handle: i64,
    /// Identifies this exact tab, so acting on it later cannot land on another one.
    pub runtime_id: String,
    pub title: String,
    pub url: String,
    /// Path to the site's icon, taken from the browser's own icon store. Empty when the
    /// browser has not stored one for this page.
    pub favicon: String,
    pub is_active: bool,
}

#[raycast]
fn list_tabs() -> Result<Vec<TabInfo>, String> {
    run_sta(list_tabs_sta)
}

/// Focuses a tab. The window is brought to the front first: a browser window that is not
/// being displayed may not expose its tabs to UI Automation at all, and foregrounding it
/// makes the browser build that part of the tree.
#[raycast]
fn activate_tab(window_handle: i64, runtime_id: String) -> Result<(), String> {
    run_sta(move || {
        let hwnd = HWND(window_handle as *mut core::ffi::c_void);
        bring_window_to_front(hwnd);
        let automation = create_automation()?;
        let tab = find_tab(&automation, hwnd, &runtime_id)?;
        let selection: IUIAutomationSelectionItemPattern = unsafe {
            tab.GetCurrentPattern(UIA_SelectionItemPatternId)
                .map_err(err)?
                .cast()
                .map_err(err)?
        };
        unsafe { selection.Select().map_err(err) }
    })
}

/// Closes a tab by invoking the close button on its tab strip entry. The button is only
/// present on the selected or hovered tab, so the tab is selected first.
#[raycast]
fn close_tab(window_handle: i64, runtime_id: String) -> Result<(), String> {
    run_sta(move || {
        let hwnd = HWND(window_handle as *mut core::ffi::c_void);
        let automation = create_automation()?;
        let tab = find_tab(&automation, hwnd, &runtime_id)?;
        unsafe {
            let selection: IUIAutomationSelectionItemPattern = tab
                .GetCurrentPattern(UIA_SelectionItemPatternId)
                .map_err(err)?
                .cast()
                .map_err(err)?;
            selection.Select().map_err(err)?;

            let button_cond = automation
                .CreatePropertyCondition(
                    UIA_ControlTypePropertyId,
                    &control_type(UIA_ButtonControlTypeId.0),
                )
                .map_err(err)?;
            match tab.FindFirst(TreeScope_Children, &button_cond) {
                Ok(button) => {
                    let invoke: IUIAutomationInvokePattern = button
                        .GetCurrentPattern(UIA_InvokePatternId)
                        .map_err(err)?
                        .cast()
                        .map_err(err)?;
                    invoke.Invoke().map_err(err)
                }
                // some browsers keep no close button in the tree at all, so the tab that
                // was just selected is closed from the keyboard instead
                Err(_) => close_selected_tab(hwnd, &tab),
            }
        }
    })
}

/// Presses Ctrl+W on the browser window.
///
/// A keystroke goes wherever the focus is, so this closes whichever tab is selected in
/// whichever window is in front. It only runs once the intended tab is known to be the
/// selected one in a window that is known to be in front, and the everything-else work is
/// done first so that the check on the focus, which is the part that can change on its own,
/// is the last thing before the keystroke. That window cannot be closed completely: another
/// application can take the focus at any moment, and Windows offers no way to aim a
/// keystroke at a particular window. It is narrowed to the smallest it can be made.
fn close_selected_tab(hwnd: HWND, tab: &IUIAutomationElement) -> Result<(), String> {
    unsafe {
        bring_window_to_front(hwnd);

        // asking the browser costs a call into it, so it happens before the focus check
        // rather than between that check and the keystroke
        if !is_selected_now(tab) {
            return Err("Could not close the tab: it is no longer the open tab".into());
        }

        let key = |code: VIRTUAL_KEY, up: bool| INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: code,
                    dwFlags: if up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) },
                    ..Default::default()
                },
            },
        };
        let keys = [
            key(VK_CONTROL, false),
            key(VK_W, false),
            key(VK_W, true),
            key(VK_CONTROL, true),
        ];

        if GetForegroundWindow() != hwnd {
            return Err("Could not close the tab: the browser window is not focused".into());
        }
        if SendInput(&keys, std::mem::size_of::<INPUT>() as i32) == 0 {
            return Err("Could not close the tab".into());
        }
        Ok(())
    }
}

fn list_tabs_sta() -> Result<Vec<TabInfo>, String> {
    // UI Automation is set up first: its initialisation is disk bound too, and starting the
    // history read before it only makes the two contend
    let automation = create_automation()?;
    // reading history touches only files, so it overlaps with the accessibility work
    let history = std::thread::spawn(history::title_urls);

    let mut browsers: HashMap<u32, Option<(String, String)>> = HashMap::new();
    let mut tabs = Vec::new();

    unsafe {
        // browser windows are picked out with plain window calls first: asking UI
        // Automation to enumerate every top-level window costs a cross-process call per
        // window, while this keeps the accessibility work to the browsers themselves
        for (hwnd, process_id) in top_level_windows() {
            // a browser usually owns several windows, so each process is resolved once
            let browser = browsers
                .entry(process_id)
                .or_insert_with(|| browser_for_process(process_id));
            let Some((browser, browser_path)) = browser.clone() else {
                continue;
            };
            let Ok(window) = automation.ElementFromHandle(hwnd) else {
                continue;
            };

            // A browser only builds its accessibility tree once something asks for it, and
            // Firefox in particular can still be starting that up when the first query
            // arrives. Every browser window has at least one tab, so coming back empty
            // means the tree was not ready rather than that there is nothing to report.
            let mut scan = scan_window(&automation, &window, true);
            if scan.tabs.is_empty() {
                std::thread::sleep(std::time::Duration::from_millis(150));
                scan = scan_window(&automation, &window, true);
            }
            let WindowScan { tabs: elements, urls } = scan;

            for tab in elements.iter() {
                let title = tab_title(tab);
                if title.is_empty() {
                    continue;
                }
                // a Document only exists for a tab that is being displayed, so its exact
                // URL is used for those; the rest are filled in from history below
                let is_active = is_selected(tab);
                let url = match is_active {
                    true => urls
                        .iter()
                        .find(|(name, _)| name == &title)
                        .map(|(_, url)| url.clone())
                        .unwrap_or_default(),
                    false => String::new(),
                };

                tabs.push(TabInfo {
                    browser: browser.clone(),
                    browser_path: browser_path.clone(),
                    window_handle: hwnd.0 as i64,
                    runtime_id: tab_runtime_id(tab),
                    url,
                    favicon: String::new(),
                    is_active,
                    title,
                });
            }
        }
    }

    let known_urls = history.join().unwrap_or_default();
    for tab in tabs.iter_mut().filter(|tab| tab.url.is_empty()) {
        if let Some(url) = known_urls.get(&tab.title) {
            tab.url = url.clone();
        }
    }

    // the browsers have already downloaded these icons, so they are read from their own
    // stores rather than fetched again
    let urls: Vec<String> = tabs
        .iter()
        .filter(|tab| !tab.url.is_empty())
        .map(|tab| tab.url.clone())
        .collect();
    let icons = favicons::icon_files(&urls);
    for tab in tabs.iter_mut() {
        if let Some(icon) = icons.get(&tab.url) {
            tab.favicon = icon.clone();
        }
    }

    Ok(tabs)
}

/// What a single pass over a browser window's chrome yields.
#[derive(Default)]
struct WindowScan {
    tabs: Vec<IUIAutomationElement>,
    /// Page title to exact URL, for the tabs currently being displayed.
    urls: Vec<(String, String)>,
}

/// Walks a browser window's own controls, without descending into the pages it renders.
///
/// Searching the whole window for tab items is far more expensive than it sounds: a
/// rendered page contributes its entire accessibility tree, so the search walks thousands
/// of nodes and picks up any tab widget the page itself defines (an ARIA tablist is
/// reported as a TabItem too). Everything needed sits above the page content, so this
/// walks breadth first and treats a Document as a leaf, never entering its subtree.
///
/// The tab strip lives only a few levels below the window, so switching to a tab passes
/// `collect_urls: false` and stops the moment it is found. Listing needs the URL of each
/// displayed page as well, and has to walk the rest of the window's controls to find them.
fn scan_window(
    automation: &IUIAutomation,
    window: &IUIAutomationElement,
    collect_urls: bool,
) -> WindowScan {
    const MAX_DEPTH: usize = 16;
    const MAX_ELEMENTS: usize = 4096;

    let mut scan = WindowScan::default();
    unsafe {
        // every property read is a call into the browser, so each step of the walk asks for
        // a whole level of children together with the properties needed from them
        let Ok(cache) = automation.CreateCacheRequest() else {
            return scan;
        };
        let _ = cache.AddProperty(UIA_ControlTypePropertyId);
        let _ = cache.AddProperty(UIA_NamePropertyId);
        let _ = cache.AddProperty(UIA_SelectionItemIsSelectedPropertyId);
        let _ = cache.AddProperty(UIA_IsOffscreenPropertyId);
        let Ok(any) = automation.CreateTrueCondition() else {
            return scan;
        };

        let mut queue = std::collections::VecDeque::from([(window.clone(), 0usize)]);
        let mut visited = 0usize;
        // the depth whose children turned out to be the tabs
        let mut tabs_found_at: Option<usize> = None;
        // each tab, and whether the browser says it is currently off screen
        let mut found: Vec<(IUIAutomationElement, bool)> = Vec::new();

        while let Some((element, depth)) = queue.pop_front() {
            // tabs sit side by side, so once a level has produced them the rest of that
            // level is still worth reading, but going deeper is not
            if let Some(found) = tabs_found_at {
                if depth > found && !collect_urls {
                    break;
                }
            }
            visited += 1;
            if depth >= MAX_DEPTH || visited > MAX_ELEMENTS {
                continue;
            }

            let Ok(children) = element.FindAllBuildCache(TreeScope_Children, &any, &cache) else {
                continue;
            };

            for i in 0..children.Length().unwrap_or(0) {
                let Ok(current) = children.GetElement(i) else {
                    continue;
                };
                let control_type = current.CachedControlType().unwrap_or_default();

                if control_type == UIA_DocumentControlTypeId {
                    // a page: read its URL, but never walk into it. Skipping its subtree is
                    // also what keeps a tab strip drawn by the page itself out of the list
                    if collect_urls {
                        if let Some(entry) = document_url(&current) {
                            scan.urls.push(entry);
                        }
                    }
                } else if control_type == UIA_TabItemControlTypeId {
                    // browsers disagree on how the tab strip is built: Chromium groups the
                    // tabs under a tab control, while the Gecko based ones nest them
                    // further down, so the tabs are taken wherever they turn up.
                    //
                    let offscreen = current.CachedIsOffscreen().unwrap_or_default().as_bool();
                    found.push((current, offscreen));
                    tabs_found_at = Some(depth);
                } else {
                    queue.push_back((current, depth + 1));
                }
            }
        }

        // A browser can hold tabs it is not showing in the same tree, such as the other
        // workspaces in Zen Browser, and reports those as offscreen. They are dropped so the
        // list matches what the window is actually showing. When the window is minimised
        // every tab looks offscreen, and dropping them all would hide the window's tabs
        // entirely, so the distinction is only made when some tab is on screen.
        let any_on_screen = found.iter().any(|(_, offscreen)| !offscreen);
        scan.tabs = found
            .into_iter()
            .filter(|(_, offscreen)| !any_on_screen || !offscreen)
            .map(|(tab, _)| tab)
            .collect();
    }
    scan
}

/// A displayed page reports its title as the Document's name and its address as the value.
fn document_url(document: &IUIAutomationElement) -> Option<(String, String)> {
    unsafe {
        let name = document.CurrentName().ok()?.to_string();
        if name.is_empty() {
            return None;
        }
        let value: IUIAutomationValuePattern = document
            .GetCurrentPattern(UIA_ValuePatternId)
            .ok()?
            .cast()
            .ok()?;
        let url = value.CurrentValue().ok()?.to_string();
        (!url.is_empty()).then_some((name, url))
    }
}

/// Resolves the tab the user picked.
///
/// Neither a tab's position nor its title identifies it: tabs move as their neighbours
/// close, titles change while a tab sits untouched, and several tabs can carry the same
/// title at once. Acting on a tab matched that way can focus a tab the user did not pick,
/// or close one they wanted to keep. The runtime id names one specific tab and keeps naming
/// it as tabs move, so when it is gone the tab really is gone, and the caller can open its
/// address instead or say so.
fn find_tab(
    automation: &IUIAutomation,
    hwnd: HWND,
    runtime_id: &str,
) -> Result<IUIAutomationElement, String> {
    // a tab whose id could not be read is listed with an empty one, and every such tab
    // would look like every other, so none of them can be acted on by id
    if runtime_id.is_empty() {
        return Err("This tab could not be identified".to_string());
    }
    let window = unsafe { automation.ElementFromHandle(hwnd) }
        .map_err(|_| "This browser window is no longer open".to_string())?;
    scan_window(automation, &window, false)
        .tabs
        .iter()
        .find(|tab| tab_runtime_id(tab) == runtime_id)
        .cloned()
        .ok_or_else(|| "This tab is no longer open".to_string())
}

/// UI Automation's identifier for an element, as dotted numbers. It stays the same while the
/// tab exists, including across the separate runs that list and then act on it.
fn tab_runtime_id(tab: &IUIAutomationElement) -> String {
    unsafe {
        let Ok(array) = tab.GetRuntimeId() else {
            return String::new();
        };
        if array.is_null() {
            return String::new();
        }
        let count = (*array).rgsabound[0].cElements as usize;
        let values = (*array).pvData as *const i32;
        let id = (0..count)
            .map(|i| (*values.add(i)).to_string())
            .collect::<Vec<_>>()
            .join(".");
        let _ = SafeArrayDestroy(array);
        id
    }
}

/// Tab elements come from a cached walk, so their name is already in hand.
fn tab_title(tab: &IUIAutomationElement) -> String {
    unsafe {
        tab.CachedName()
            .or_else(|_| tab.CurrentName())
            .map(|name| clean_title(&name.to_string()))
            .unwrap_or_default()
    }
}

/// Asks the browser directly rather than trusting the cached walk, for the cases where a
/// wrong answer would act on the wrong tab.
fn is_selected_now(tab: &IUIAutomationElement) -> bool {
    unsafe {
        tab.GetCurrentPropertyValue(UIA_SelectionItemIsSelectedPropertyId)
            .ok()
            .map(|value| bool::try_from(&value).unwrap_or(false))
            .unwrap_or(false)
    }
}

/// Read from the cached walk, so this costs nothing.
fn is_selected(tab: &IUIAutomationElement) -> bool {
    unsafe {
        tab.GetCachedPropertyValue(UIA_SelectionItemIsSelectedPropertyId)
            .or_else(|_| tab.GetCurrentPropertyValue(UIA_SelectionItemIsSelectedPropertyId))
            .ok()
            .map(|value| bool::try_from(&value).unwrap_or(false))
            .unwrap_or(false)
    }
}

fn bring_window_to_front(hwnd: HWND) {
    unsafe {
        if IsIconic(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_RESTORE);
        } else {
            let _ = ShowWindow(hwnd, SW_SHOW);
        }
        let _ = SetForegroundWindow(hwnd);
    }
}

/// Visible top-level windows, paired with the process that owns them.
fn top_level_windows() -> Vec<(HWND, u32)> {
    unsafe extern "system" fn collect(hwnd: HWND, param: LPARAM) -> windows::core::BOOL {
        unsafe {
            if IsWindowVisible(hwnd).as_bool() {
                let mut process_id = 0u32;
                GetWindowThreadProcessId(hwnd, Some(&mut process_id));
                if process_id != 0 {
                    (*(param.0 as *mut Vec<(HWND, u32)>)).push((hwnd, process_id));
                }
            }
        }
        true.into()
    }

    let mut windows: Vec<(HWND, u32)> = Vec::new();
    unsafe {
        let _ = EnumWindows(
            Some(collect),
            LPARAM(&mut windows as *mut Vec<(HWND, u32)> as isize),
        );
    }
    windows
}

fn browser_for_process(process_id: u32) -> Option<(String, String)> {
    let path = process_path(process_id)?;
    let stem = std::path::Path::new(&path)
        .file_stem()?
        .to_string_lossy()
        .to_lowercase();
    BROWSERS
        .iter()
        .find(|(process, _)| *process == stem)
        .map(|(_, name)| (name.to_string(), path))
}

fn process_path(process_id: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id).ok()?;
        let mut buffer = [0u16; MAX_PATH as usize];
        let mut size = buffer.len() as u32;
        let result = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buffer.as_mut_ptr()),
            &mut size,
        );
        let _ = CloseHandle(handle);
        result.ok()?;
        Some(String::from_utf16_lossy(&buffer[..size as usize]))
    }
}

fn clean_title(raw: &str) -> String {
    // pages put an unread count in front of their title, and it changes while the tab just
    // sits there, so it cannot be part of how a tab is recognised later
    let raw = raw.trim();
    let without_count = raw
        .strip_prefix('(')
        .and_then(|rest| rest.split_once(')'))
        .filter(|(count, _)| !count.is_empty() && count.chars().all(|c| c.is_ascii_digit()))
        .map(|(_, rest)| rest.trim_start())
        .unwrap_or(raw);

    let mut title = without_count.to_string();
    loop {
        let length = title.len();
        for suffix in STATE_SUFFIXES {
            if let Some(stripped) = title.strip_suffix(suffix) {
                title = stripped.to_string();
            }
        }
        for marker in MEMORY_MARKERS {
            if let Some(position) = title.rfind(marker) {
                if is_memory_size(&title[position + marker.len()..]) {
                    title.truncate(position);
                }
            }
        }
        if title.len() == length {
            return title.trim().to_string();
        }
    }
}

/// Matches the "421 MB" part of a " - Memory usage - 421 MB" suffix.
fn is_memory_size(text: &str) -> bool {
    let mut parts = text.split(' ');
    let (Some(number), Some(unit), None) = (parts.next(), parts.next(), parts.next()) else {
        return false;
    };
    !number.is_empty()
        && number.chars().all(|c| c.is_ascii_digit() || c == '.')
        && matches!(unit, "KB" | "MB" | "GB" | "TB")
}

/// UI Automation matches control types against an integer VARIANT.
fn control_type(id: i32) -> VARIANT {
    let mut variant = VARIANT::default();
    unsafe {
        let inner = &mut *variant.Anonymous.Anonymous;
        inner.vt = VT_I4;
        inner.Anonymous.lVal = id;
    }
    variant
}

fn create_automation() -> Result<IUIAutomation, String> {
    unsafe { CoCreateInstance(&CUIAutomation8, None, CLSCTX_ALL).map_err(err) }
}

fn err(error: windows::core::Error) -> String {
    error.message()
}

/// UI Automation expects a single-threaded apartment, which the runtime's worker threads
/// do not provide, so the work runs on a thread this owns.
fn run_sta<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    std::thread::spawn(move || {
        unsafe {
            CoInitializeEx(None, COINIT_APARTMENTTHREADED)
                .ok()
                .map_err(err)?;
        }
        let result = work();
        unsafe { CoUninitialize() };
        result
    })
    .join()
    .map_err(|_| "The tab lookup stopped unexpectedly".to_string())?
}
