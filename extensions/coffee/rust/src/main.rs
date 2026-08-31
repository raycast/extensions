use raycast_rust_macros::raycast;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use windows::Win32::Foundation::{CloseHandle, FILETIME};
use windows::Win32::System::Power::{
    SetThreadExecutionState, ES_CONTINUOUS, ES_DISPLAY_REQUIRED, ES_SYSTEM_REQUIRED, EXECUTION_STATE,
};
use windows::Win32::System::Threading::{
    GetExitCodeProcess, GetProcessTimes, OpenProcess, QueryFullProcessImageNameW, TerminateProcess,
    PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
};

const STILL_ACTIVE: u32 = 259;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct KeepAwakeConfig {
    prevent_display: bool,
    prevent_system: bool,
    duration_seconds: Option<u64>,
    pid: Option<u32>,
    window_handle: Option<usize>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct KeepAwakeState {
    running: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredState {
    pid: u32,
    start_time: u64,
    start_ticks: u64,
    duration_seconds: Option<u64>,
}

fn state_dir() -> Result<PathBuf, String> {
    // Resolve the real per-user AppData dir via the Win32 API rather than
    // relying on environment variables, which extension runtimes may strip.
    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::SHGetFolderPathW;

        const CSIDL_LOCAL_APPDATA: i32 = 0x001c;
        let mut buf = [0u16; 260];
        let hr = unsafe { SHGetFolderPathW(None, CSIDL_LOCAL_APPDATA, None, 0, &mut buf) };
        if hr.is_ok() {
            let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
            let dir = PathBuf::from(String::from_utf16_lossy(&buf[..end])).join("coffee");
            if std::fs::create_dir_all(&dir).is_ok() {
                return Ok(dir);
            }
        }
    }

    // Fallbacks for non-Windows builds and unusual environments.
    let candidates = [
        std::env::var_os("LOCALAPPDATA").map(PathBuf::from),
        std::env::var_os("USERPROFILE").map(|p| PathBuf::from(p).join("AppData").join("Local")),
        std::env::var_os("APPDATA").map(PathBuf::from),
        std::env::var_os("TEMP").map(PathBuf::from),
        std::env::var_os("TMP").map(PathBuf::from),
        std::env::var_os("HOME").map(PathBuf::from),
    ];

    for base in candidates.into_iter().flatten() {
        let dir = base.join("coffee");
        if std::fs::create_dir_all(&dir).is_ok() {
            return Ok(dir);
        }
    }

    Err("no writable directory available for coffee state".to_string())
}

fn state_path() -> Result<PathBuf, String> {
    Ok(state_dir()?.join("state.json"))
}

fn stop_flag_path() -> Result<PathBuf, String> {
    Ok(state_dir()?.join("stop.flag"))
}

fn write_stored_state(state: &StoredState) -> Result<(), String> {
    let dir = state_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string(state).map_err(|e| e.to_string())?;
    std::fs::write(state_path()?, json).map_err(|e| e.to_string())
}

fn read_stored_state() -> Result<Option<StoredState>, String> {
    let path = state_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    match serde_json::from_str(&raw) {
        Ok(state) => Ok(Some(state)),
        Err(_) => Ok(None),
    }
}

fn clear_state() -> Result<(), String> {
    let path = state_path()?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn write_stop_flag() -> Result<(), String> {
    let dir = state_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(stop_flag_path()?, "").map_err(|e| e.to_string())
}

fn clear_stop_flag() -> Result<(), String> {
    let path = stop_flag_path()?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn stop_requested() -> bool {
    stop_flag_path().map(|p| p.exists()).unwrap_or(false)
}

fn process_alive(pid: u32) -> bool {
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) };
    match handle {
        Ok(handle) => {
            let mut exit_code = 0u32;
            let ok = unsafe { GetExitCodeProcess(handle, &mut exit_code) }.is_ok();
            unsafe { let _ = CloseHandle(handle); }
            ok && exit_code == STILL_ACTIVE
        }
        Err(_) => false,
    }
}

fn terminate_process(pid: u32) -> bool {
    let handle = unsafe { OpenProcess(PROCESS_TERMINATE, false, pid) };
    match handle {
        Ok(handle) => {
            let ok = unsafe { TerminateProcess(handle, 1) }.is_ok();
            unsafe { let _ = CloseHandle(handle); }
            ok
        }
        Err(_) => false,
    }
}

/// The creation time of `pid` as raw FILETIME 100ns ticks, or `None` if the
/// process no longer exists or cannot be queried.
fn process_creation_ticks(pid: u32) -> Option<u64> {
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) };
    let Ok(handle) = handle else {
        return None;
    };
    let mut creation = FILETIME::default();
    let mut exit = FILETIME::default();
    let mut kernel = FILETIME::default();
    let mut user = FILETIME::default();
    let ok = unsafe { GetProcessTimes(handle, &mut creation, &mut exit, &mut kernel, &mut user) }.is_ok();
    unsafe { let _ = CloseHandle(handle); }
    if !ok {
        return None;
    }
    Some(((creation.dwHighDateTime as u64) << 32) | (creation.dwLowDateTime as u64))
}

/// Whether the given PID is still the keep-awake worker that recorded
/// `expected_ticks`. Compares the exact process-creation FILETIME (100ns
/// granularity), so even a same-second PID reuse is rejected. Guards both the
/// status queries and `stop_caffeinate` from treating an unrelated process as
/// the worker.
fn pid_matches_worker(pid: u32, expected_ticks: u64) -> bool {
    process_creation_ticks(pid).is_some_and(|ticks| ticks == expected_ticks)
}

/// The full path of the executable backing `pid`, or `None` when it cannot be
/// queried (e.g. an elevated process). Used by the picker to show app icons.
fn process_image_path(pid: u32) -> Option<String> {
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) };
    let Ok(handle) = handle else {
        return None;
    };
    let mut buf = [0u16; 1024];
    let mut len = buf.len() as u32;
    let ok = unsafe {
        QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, windows::core::PWSTR(buf.as_mut_ptr()), &mut len)
    }
    .is_ok();
    unsafe { let _ = CloseHandle(handle); }
    if !ok || len == 0 {
        return None;
    }
    Some(String::from_utf16_lossy(&buf[..len as usize]))
}

/// Whether the tracked window is still open, on-screen, and owned by the
/// originating process. Treats a window that was closed or hidden (e.g. an app
/// minimized to the system tray) as gone so the worker releases the execution
/// state even though the process itself is still running.
fn window_alive(window_handle: usize, pid: Option<u32>) -> bool {
    use std::ffi::c_void;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{GetWindowThreadProcessId, IsWindow, IsWindowVisible};

    let hwnd = HWND(window_handle as *const c_void as *mut c_void);
    unsafe {
        if !IsWindow(hwnd).as_bool() {
            return false;
        }
        if let Some(owner_pid) = pid {
            // Guard against HWND reuse: the handle must still belong to the
            // same process that we originally started watching.
            let mut window_pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut window_pid));
            if window_pid != owner_pid {
                return false;
            }
        }
        IsWindowVisible(hwnd).as_bool()
    }
}

/// Bridge: spawn a detached worker process that holds the keep-awake state.
#[raycast]
fn start_caffeinate(config: KeepAwakeConfig) -> Result<(), String> {
    let _ = stop_caffeinate();

    let exe = std::env::current_exe().map_err(|e| format!("cannot locate own executable: {e}"))?;

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;

        let mut child = std::process::Command::new(&exe)
            .arg("start_caffeinate_worker")
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("failed to spawn keep-awake worker: {e}"))?;

        if let Some(mut stdin) = child.stdin.take() {
            // The harness expects an array of positional arguments.
            let payload = serde_json::to_string(&vec![&config]).map_err(|e| e.to_string())?;
            stdin.write_all(payload.as_bytes()).map_err(|e| e.to_string())?;
            drop(stdin);
        }
        // Dropping the Child without calling wait() lets it run detached.
    }

    #[cfg(not(windows))]
    {
        return Ok(());
    }

    // Wait for the worker to confirm it is holding the execution state before
    // reporting success. The worker only persists its state after acquiring
    // ES_SYSTEM/DISPLAY_REQUIRED, so its absence within the timeout means the
    // worker failed to start and we must not claim caffeination is active.
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        if let Some(state) = read_stored_state()? {
            if pid_matches_worker(state.pid, state.start_ticks) {
                return Ok(());
            }
        }
        if Instant::now() >= deadline {
            return Err("keep-awake worker failed to start".to_string());
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}

/// Worker entry point spawned by start_caffeinate.
#[raycast]
async fn start_caffeinate_worker(config: KeepAwakeConfig) -> Result<(), String> {
    let _ = clear_stop_flag();

    let pid = std::process::id();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_secs();
    let start_ticks = process_creation_ticks(pid)
        .ok_or_else(|| "cannot determine keep-awake worker identity".to_string())?;

    let mut flags = ES_CONTINUOUS.0;
    if config.prevent_display {
        flags |= ES_DISPLAY_REQUIRED.0;
    }
    if config.prevent_system {
        flags |= ES_SYSTEM_REQUIRED.0;
    }
    if unsafe { SetThreadExecutionState(EXECUTION_STATE(flags)) }.0 == 0 {
        return Err("SetThreadExecutionState failed".to_string());
    }

    // Persist the state only after the execution state is actually held. This
    // write doubles as the "worker is running" signal that start_caffeinate
    // waits for before reporting success.
    write_stored_state(&StoredState {
        pid,
        start_time: now,
        start_ticks,
        duration_seconds: config.duration_seconds,
    })?;

    let started = Instant::now();
    loop {
        let timed_out = config.duration_seconds.is_some_and(|secs| started.elapsed().as_secs() >= secs);
        let app_gone = config.pid.is_some_and(|target_pid| !process_alive(target_pid))
            || config.window_handle.is_some_and(|hwnd| !window_alive(hwnd, config.pid));
        if timed_out || app_gone || stop_requested() {
            break;
        }
        tokio::time::sleep(Duration::from_millis(250)).await;
    }

    // Release the request before exiting so Windows clears the flag cleanly.
    unsafe { let _ = SetThreadExecutionState(ES_CONTINUOUS); }
    let _ = clear_state();
    Ok(())
}

/// Bridge: stop the keep-awake worker and release the execution state.
/// Returns true when a worker was running and successfully terminated, or
/// false when there was no running worker to stop. Propagates an error if a
/// running worker could not be terminated.
#[raycast]
fn stop_caffeinate() -> Result<bool, String> {
    let _ = write_stop_flag();
    let state = read_stored_state()?;
    let had_worker = match &state {
        Some(s) if pid_matches_worker(s.pid, s.start_ticks) => true,
        _ => false,
    };
    if had_worker {
        let pid = state.as_ref().unwrap().pid;
        if !terminate_process(pid) {
            // The terminate call failed; give the worker a brief moment to exit
            // on its own via the stop flag, then confirm it is gone.
            for _ in 0..50 {
                std::thread::sleep(Duration::from_millis(2));
                match read_stored_state()? {
                    Some(cur) if pid_matches_worker(cur.pid, cur.start_ticks) => {}
                    _ => break,
                }
            }
            if let Some(cur) = read_stored_state()? {
                if pid_matches_worker(cur.pid, cur.start_ticks) {
                    // Preserve tracking state so a later stop can retry.
                    return Err("failed to terminate caffeination worker".to_string());
                }
            }
        }
    }
    let _ = clear_state();
    Ok(had_worker)
}

/// Bridge: report whether a keep-awake worker is currently running.
#[raycast]
fn is_caffeinate_running() -> Result<KeepAwakeState, String> {
    let running = match read_stored_state()? {
        Some(state) => pid_matches_worker(state.pid, state.start_ticks),
        None => false,
    };
    if !running {
        let _ = clear_state();
    }
    Ok(KeepAwakeState { running })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CaffeinateStatus {
    running: bool,
    start_time: Option<u64>,
    duration_seconds: Option<u64>,
}

/// Bridge: report keep-awake state plus the worker's recorded duration and
/// start time, used by the menu bar for live countdowns.
#[raycast]
fn get_caffeinate_state() -> Result<CaffeinateStatus, String> {
    match read_stored_state()? {
        Some(state) if pid_matches_worker(state.pid, state.start_ticks) => Ok(CaffeinateStatus {
            running: true,
            start_time: Some(state.start_time),
            duration_seconds: state.duration_seconds,
        }),
        _ => {
            let _ = clear_state();
            Ok(CaffeinateStatus {
                running: false,
                start_time: None,
                duration_seconds: None,
            })
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessInfo {
    name: String,
    pid: u32,
    window_handle: usize,
    path: Option<String>,
}

/// Bridge: list running applications that have a visible window, so the user
/// can pick which one to caffeinate while it is open. Utility and system
/// processes (the Raycast host, File Explorer, shell/text-input hosts, the
/// extension's node runtime, etc.) are filtered out of the results.
#[raycast]
fn list_processes() -> Result<Vec<ProcessInfo>, String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::{BOOL, HWND, LPARAM, TRUE};
        use windows::Win32::System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
        };
        use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible};
        use std::collections::HashMap;

        const BLOCKED_EXES: &[&str] = &[
            "raycast",
            "raycast.uiaccess",
            "node",
            "dwm",
            "sihost",
            "runtimebroker",
            "shellexperiencehost",
            "startmenuexperiencehost",
            "searchhost",
            "shellhost",
            "windows.internal.shell",
            "windowsinternalcomposableshell",
            "textinputhost",
            "widgets",
            "applicationframehost",
            "csrss",
            "winlogon",
            "wininit",
            "conhost",
            "systemsettings",
            "powertoys.quickaccess",
            "siw",
        ];

        fn is_blocked(name: &str) -> bool {
            let lower = name.to_lowercase();
            BLOCKED_EXES.iter().any(|b| lower == *b) || lower.contains("raycast")
        }

        /// Reduce a window title to its final "app name" section so contextual
        /// prefixes (tab titles, file names) don't inflate the picker list.
        /// "[tab title] - Brave" -> "Brave".
        fn crop_title(title: &str) -> String {
            const SEPARATORS: &[char] = &['-', '—', '–', '·', '|', ':'];
            let trimmed = title.trim();
            trimmed
                .split(SEPARATORS)
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .last()
                .map(|s| s.to_string())
                .unwrap_or_else(|| trimmed.to_string())
        }

        /// Pick the display name for a window: a curated exe-based name when we
        /// know the app (so title-only windows like a Notion page are labelled
        /// correctly), the raw location for File Explorer windows (never cropped,
        /// so "Local Disk (C:)" is preserved), and a cropped title otherwise.
        fn app_display_name(stem: &str, raw_title: &str) -> String {
            if stem.eq_ignore_ascii_case("explorer") {
                return format!("{} - File Explorer", raw_title.trim());
            }
            if stem.eq_ignore_ascii_case("windowsterminal") {
                return format!("{} - Terminal", crop_title(raw_title));
            }
            const MAP: &[(&str, &str)] = &[
                ("brave", "Brave"),
                ("chrome", "Google Chrome"),
                ("msedge", "Microsoft Edge"),
                ("firefox", "Firefox"),
                ("code", "Visual Studio Code"),
                ("code-insiders", "Visual Studio Code (Insiders)"),
                ("notion", "Notion"),
                ("opencode", "OpenCode"),
                ("cursor", "Cursor"),
                ("telegram", "Telegram"),
                ("slack", "Slack"),
                ("discord", "Discord"),
                ("zoom", "Zoom"),
                ("whatsapp", "WhatsApp"),
                ("signal", "Signal"),
                ("spotify", "Spotify"),
                ("outlook", "Outlook"),
                ("winword", "Microsoft Word"),
                ("excel", "Microsoft Excel"),
                ("powerpnt", "Microsoft PowerPoint"),
                ("onenote", "Microsoft OneNote"),
                ("teams", "Microsoft Teams"),
                ("ms-teams", "Microsoft Teams"),
                ("notepad", "Microsoft Notepad"),
                ("mspaint", "Paint"),
                ("obs", "OBS Studio"),
                ("vlc", "VLC Media Player"),
                ("figma", "Figma"),
                ("obsidian", "Obsidian"),
                ("gitkraken", "GitKraken"),
                ("githubdesktop", "GitHub Desktop"),
                ("steam", "Steam"),
                ("postman", "Postman"),
                ("insomnia", "Insomnia"),
                ("idea64", "IntelliJ IDEA"),
                ("pycharm64", "PyCharm"),
                ("webstorm64", "WebStorm"),
                ("goland64", "GoLand"),
                ("datagrip", "DataGrip"),
                ("docker desktop", "Docker Desktop"),
                ("dockerfrontend", "Docker Desktop"),
            ];
            let lower = stem.to_lowercase();
            for (key, display) in MAP {
                if lower == *key {
                    return display.to_string();
                }
            }
            crop_title(raw_title)
        }

        /// Remove a trailing unread/badge segment like " (3)" or " (9+)":
        /// "Telegram (3)" -> "Telegram".
        fn strip_unread(name: &str) -> String {
            let trimmed = name.trim_end();
            if let Some(close) = trimmed.rfind(')') {
                if let Some(open) = trimmed[..close].rfind('(') {
                    let inner = &trimmed[open + 1..close];
                    let digits = inner.trim_start_matches(['+', '-']);
                    if !digits.is_empty() && digits.chars().all(|c| c.is_ascii_digit()) {
                        return trimmed[..open].trim_end().to_string();
                    }
                }
            }
            trimmed.to_string()
        }

        struct WindowMap(HashMap<u32, (HWND, String)>);
        unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
            if IsWindowVisible(hwnd).as_bool() {
                let len = GetWindowTextLengthW(hwnd);
                if len > 0 {
                    let mut buf = vec![0u16; (len as usize) + 1];
                    let written = GetWindowTextW(hwnd, &mut buf);
                    if written > 0 {
                        let raw_title = String::from_utf16_lossy(&buf[..written as usize]);
                        // Skip the desktop's own "Program Manager" window
                        // (class Progman): it belongs to explorer.exe but is
                        // not a File Explorer folder window. Without this it
                        // shows up whenever the folder window is unfocused or
                        // hidden, since Z-order puts Progman first.
                        if raw_title.trim().eq_ignore_ascii_case("Program Manager") {
                            return TRUE;
                        }
                        let title = if raw_title.trim().is_empty() {
                            // Sentinel: non-empty text but whitespace-only.
                            raw_title.trim().to_string()
                        } else {
                            raw_title
                        };
                        let mut pid = 0u32;
                        GetWindowThreadProcessId(hwnd, Some(&mut pid));
                        if pid != 0 {
                            let windows = &mut *(lparam.0 as *mut WindowMap);
                            windows.0.entry(pid).or_insert((hwnd, title));
                        }
                    }
                }
            }
            TRUE
        }

        let mut windows = WindowMap(HashMap::new());
        unsafe {
            let _ = EnumWindows(Some(enum_proc), LPARAM(&mut windows as *mut _ as isize));
        }

        if windows.0.is_empty() {
            return Ok(Vec::new());
        }

        let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }
            .map_err(|e| format!("CreateToolhelp32Snapshot failed: {e}"))?;
        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        let mut processes: Vec<ProcessInfo> = Vec::new();
        if unsafe { Process32FirstW(snapshot, &mut entry) }.is_ok() {
            loop {
                if let Some(&(hwnd, ref title)) = windows.0.get(&entry.th32ProcessID) {
                    let stem = String::from_utf16_lossy(&entry.szExeFile)
                        .trim_end_matches('\0')
                        .trim_end_matches(".exe")
                        .to_string();
                    // Explorer is only ever enumerated here when it has a
                    // visible window with a title (the enum callback requires
                    // both), so a real File Explorer window always qualifies;
                    // the titleless shell/taskbar windows never show up. This
                    // works no matter the Explorer window class (the newer
                    // Windows 11 one differs from CabinetWClass).
                    let hidden = is_blocked(&stem);
                    if hidden {
                        if unsafe { Process32NextW(snapshot, &mut entry) }.is_err() {
                            break;
                        }
                        continue;
                    }
                    let name = strip_unread(&app_display_name(&stem, title));
                    processes.push(ProcessInfo {
                        name,
                        pid: entry.th32ProcessID,
                        window_handle: hwnd.0 as usize,
                        path: process_image_path(entry.th32ProcessID),
                    });
                }
                if unsafe { Process32NextW(snapshot, &mut entry) }.is_err() {
                    break;
                }
            }
        }
        unsafe { let _ = CloseHandle(snapshot); }

        processes.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(processes)
    }

    #[cfg(not(windows))]
    {
        Ok(Vec::new())
    }
}