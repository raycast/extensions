use raycast_rust_macros::raycast;
use serde::Serialize;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Win32::Foundation::HWND;

#[derive(Serialize)]
pub struct MediaSessionInfo {
    pub app_id: String,
    pub app_name: String,
    pub title: String,
    pub artist: String,
    pub is_playing: bool,
}

#[raycast]
fn list_sessions() -> Result<Vec<MediaSessionInfo>, String> {
    let manager = get_session_manager()?;
    let sessions = manager.GetSessions().map_err(|e| format!("GetSessions failed: {}", e))?;
    let iterator = sessions.First().map_err(|e| format!("First failed: {}", e))?;

    let mut result = Vec::new();

    loop {
        let has_current = iterator.HasCurrent().map_err(|e| format!("HasCurrent failed: {}", e))?;
        if !has_current {
            break;
        }
        let session = iterator.Current().map_err(|e| format!("Current failed: {}", e))?;

        let app_id_h = session
            .SourceAppUserModelId()
            .map_err(|e| format!("SourceAppUserModelId failed: {}", e))?;
        let app_id = app_id_h.to_string();

        let props = session
            .TryGetMediaPropertiesAsync()
            .map_err(|e| format!("TryGetMediaPropertiesAsync failed: {}", e))?
            .get()
            .map_err(|e| format!("Get media properties failed: {}", e))?;

        let title = props.Title().map_err(|e| format!("Title failed: {}", e))?.to_string();
        let artist = props.Artist().map_err(|e| format!("Artist failed: {}", e))?.to_string();

        let info = session.GetPlaybackInfo().map_err(|e| format!("GetPlaybackInfo failed: {}", e))?;
        let status = info.PlaybackStatus().map_err(|e| format!("PlaybackStatus failed: {}", e))?;
        let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

        result.push(MediaSessionInfo {
            app_id: app_id.clone(),
            app_name: format_app_name(&app_id),
            title,
            artist,
            is_playing,
        });

        iterator.MoveNext().map_err(|e| format!("MoveNext failed: {}", e))?;
    }

    Ok(result)
}

#[raycast]
fn switch_session(target_app_id: String) -> Result<(), String> {
    let manager = get_session_manager()?;
    let sessions = manager.GetSessions().map_err(|e| format!("GetSessions failed: {}", e))?;
    let iterator = sessions.First().map_err(|e| format!("First failed: {}", e))?;

    let mut target_session: Option<GlobalSystemMediaTransportControlsSession> = None;

    loop {
        let has_current = iterator.HasCurrent().map_err(|e| format!("HasCurrent failed: {}", e))?;
        if !has_current {
            break;
        }
        let session = iterator.Current().map_err(|e| format!("Current failed: {}", e))?;

        let app_id_h = session
            .SourceAppUserModelId()
            .map_err(|e| format!("SourceAppUserModelId failed: {}", e))?;
        let app_id = app_id_h.to_string();

        if app_id == target_app_id {
            target_session = Some(session);
        } else {
            let info = session.GetPlaybackInfo().map_err(|e| format!("GetPlaybackInfo failed: {}", e))?;
            let status = info.PlaybackStatus().map_err(|e| format!("PlaybackStatus failed: {}", e))?;
            if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                let _ = session.TryPauseAsync().map_err(|e| format!("TryPauseAsync failed: {}", e))?.get();
                for _ in 0..50 {
                    if let Ok(info) = session.GetPlaybackInfo() {
                        if let Ok(status) = info.PlaybackStatus() {
                            if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                                break;
                            }
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
            }
        }

        iterator.MoveNext().map_err(|e| format!("MoveNext failed: {}", e))?;
    }

    if let Some(session) = target_session {
        let _ = session.TryPlayAsync().map_err(|e| format!("TryPlayAsync failed: {}", e))?.get();
        // Wait for the session to actually start playing
        for _ in 0..50 {
            let info = session.GetPlaybackInfo().map_err(|e| format!("GetPlaybackInfo failed: {}", e))?;
            if let Ok(status) = info.PlaybackStatus() {
                if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                    break;
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        Ok(())
    } else {
        Err(format!("Session not found: {}", target_app_id))
    }
}

#[raycast]
fn pause_session(target_app_id: String) -> Result<(), String> {
    let session = find_session(&target_app_id)?;
    let _ = session.TryPauseAsync().map_err(|e| format!("TryPauseAsync failed: {}", e))?.get();
    for _ in 0..50 {
        if let Ok(info) = session.GetPlaybackInfo() {
            if let Ok(status) = info.PlaybackStatus() {
                if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                    break;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    Ok(())
}

#[raycast]
fn play_session(target_app_id: String) -> Result<(), String> {
    let session = find_session(&target_app_id)?;
    let _ = session.TryPlayAsync().map_err(|e| format!("TryPlayAsync failed: {}", e))?.get();
    for _ in 0..50 {
        if let Ok(info) = session.GetPlaybackInfo() {
            if let Ok(status) = info.PlaybackStatus() {
                if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                    break;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    Ok(())
}

#[raycast]
fn previous_track(target_app_id: String) -> Result<(), String> {
    let session = find_session(&target_app_id)?;
    let old_title = get_session_title(&session)?;
    session.TrySkipPreviousAsync()
        .map_err(|e| format!("TrySkipPreviousAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Skip previous failed: {}", e))?;
    poll_title_change(&session, &old_title);
    Ok(())
}

#[raycast]
fn next_track(target_app_id: String) -> Result<(), String> {
    let session = find_session(&target_app_id)?;
    let old_title = get_session_title(&session)?;
    session.TrySkipNextAsync()
        .map_err(|e| format!("TrySkipNextAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Skip next failed: {}", e))?;
    poll_title_change(&session, &old_title);
    Ok(())
}

fn get_session_title(session: &GlobalSystemMediaTransportControlsSession) -> Result<String, String> {
    let props = session
        .TryGetMediaPropertiesAsync()
        .map_err(|e| format!("TryGetMediaPropertiesAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Get media properties failed: {}", e))?;
    Ok(props.Title().map_err(|e| format!("Title failed: {}", e))?.to_string())
}

fn poll_title_change(session: &GlobalSystemMediaTransportControlsSession, old_title: &str) {
    for _ in 0..50 {
        if let Ok(props) = session.TryGetMediaPropertiesAsync().and_then(|op| op.get()) {
            if let Ok(title) = props.Title() {
                if title.to_string() != old_title {
                    return;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
}

fn find_session(target_app_id: &str) -> Result<GlobalSystemMediaTransportControlsSession, String> {
    let manager = get_session_manager()?;
    let sessions = manager.GetSessions().map_err(|e| format!("GetSessions failed: {}", e))?;
    let iterator = sessions.First().map_err(|e| format!("First failed: {}", e))?;

    loop {
        let has_current = iterator.HasCurrent().map_err(|e| format!("HasCurrent failed: {}", e))?;
        if !has_current {
            break;
        }
        let session = iterator.Current().map_err(|e| format!("Current failed: {}", e))?;
        let app_id_h = session.SourceAppUserModelId().map_err(|e| format!("SourceAppUserModelId failed: {}", e))?;
        if app_id_h.to_string() == target_app_id {
            return Ok(session);
        }
        iterator.MoveNext().map_err(|e| format!("MoveNext failed: {}", e))?;
    }

    Err(format!("Session not found: {}", target_app_id))
}

#[raycast]
fn reveal_application(target_app_id: String) -> Result<(), String> {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use windows::core::HSTRING;
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM, TRUE};
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
    };
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowModuleFileNameW, GetWindowThreadProcessId,
        IsWindowVisible, SW_SHOWNORMAL,
    };

    let exe_names = extract_exe_names(&target_app_id);
    static FOUND_HWND: AtomicUsize = AtomicUsize::new(0);
    const BUF_SIZE: usize = 260;

    unsafe {
        // Pass 1: enumerate all visible windows, match module path against candidates
        FOUND_HWND.store(0, Ordering::SeqCst);
        unsafe extern "system" fn enum_by_module(hwnd: HWND, lparam: LPARAM) -> BOOL {
            if !IsWindowVisible(hwnd).as_bool() {
                return TRUE;
            }
            let mut buf = [0u16; BUF_SIZE];
            let len = GetWindowModuleFileNameW(hwnd, &mut buf);
            if len == 0 { return TRUE; }
            let full = String::from_utf16_lossy(&buf[..len as usize]).to_lowercase();
            let names = &*(lparam.0 as *const Vec<String>);
            // Try matching exe name first
            let exe = full.split('\\').last().unwrap_or("").trim_end_matches(".exe");
            if names.contains(&exe.to_string()) || names.iter().any(|c| c.len() >= 4 && (exe.contains(c.as_str()) || c.contains(exe))) {
                FOUND_HWND.store(hwnd.0 as usize, Ordering::SeqCst);
                return BOOL(0);
            }
            // Try matching full path against candidates (catches Chromium-based browsers like Helium -> "chrome.exe" in "Helium" folder)
            if names.iter().any(|c| c.len() >= 3 && full.contains(c.as_str())) {
                FOUND_HWND.store(hwnd.0 as usize, Ordering::SeqCst);
                return BOOL(0);
            }
            TRUE
        }
        let _ = EnumWindows(Some(enum_by_module), LPARAM(&exe_names as *const _ as isize));

        if FOUND_HWND.load(Ordering::SeqCst) != 0 {
            let hwnd = HWND(FOUND_HWND.load(Ordering::SeqCst) as *mut _);
            bring_to_front(hwnd);
            return Ok(());
        }

        // Pass 2: try process snapshot + PID window matching (broader search)
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
            .map_err(|e| format!("CreateToolhelp32Snapshot failed: {}", e))?;
        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        let mut pids: Vec<u32> = Vec::new();
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let name = String::from_utf16_lossy(&entry.szExeFile)
                    .trim_end_matches('\0')
                    .trim_end_matches(".exe")
                    .to_lowercase();
                let mut matched = exe_names.contains(&name) || exe_names.iter().any(|c| c.len() >= 4 && (name.contains(c.as_str()) || c.contains(name.as_str())));
                if !matched {
                    let chrome_aliases = ["helium", "iridium", "slimjet", "cent"];
                    if name == "chrome" && exe_names.iter().any(|n| chrome_aliases.contains(&n.as_str())) {
                        matched = true;
                    }
                }
                if matched {
                    pids.push(entry.th32ProcessID);
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);

        if !pids.is_empty() {
            static TARGET_PID: AtomicUsize = AtomicUsize::new(0);
            unsafe extern "system" fn enum_by_pid(hwnd: HWND, _lparam: LPARAM) -> BOOL {
                if !IsWindowVisible(hwnd).as_bool() {
                    return TRUE;
                }
                let target = TARGET_PID.load(Ordering::SeqCst);
                let mut pid: u32 = 0;
                let _ = GetWindowThreadProcessId(hwnd, Some(&mut pid));
                if pid as usize == target {
                    FOUND_HWND.store(hwnd.0 as usize, Ordering::SeqCst);
                    return BOOL(0);
                }
                TRUE
            }

            for &pid in &pids {
                TARGET_PID.store(pid as usize, Ordering::SeqCst);
                FOUND_HWND.store(0, Ordering::SeqCst);
                let _ = EnumWindows(Some(enum_by_pid), LPARAM(0));
                if FOUND_HWND.load(Ordering::SeqCst) != 0 {
                    break;
                }
            }

            if FOUND_HWND.load(Ordering::SeqCst) != 0 {
                let hwnd = HWND(FOUND_HWND.load(Ordering::SeqCst) as *mut _);
                bring_to_front(hwnd);
                return Ok(());
            }
        }

        // Pass 3: launch via shell:AppsFolder as last resort
        let path = format!("shell:AppsFolder\\{}", target_app_id);
        let result = ShellExecuteW(None, &HSTRING::from("open"), &HSTRING::from(&path), None, None, SW_SHOWNORMAL);
        if (result.0 as isize) <= 32 {
            return Err(format!("ShellExecuteW failed with code: {}", result.0 as isize));
        }
        Ok(())
    }
}

unsafe fn bring_to_front(hwnd: HWND) {
    use windows::Win32::UI::Input::KeyboardAndMouse::{keybd_event, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VK_MENU};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowPlacement, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOWMINIMIZED, WINDOWPLACEMENT,
    };
    let mut placement = WINDOWPLACEMENT::default();
    placement.length = std::mem::size_of::<WINDOWPLACEMENT>() as u32;
    if GetWindowPlacement(hwnd, &mut placement).is_ok() && placement.showCmd == SW_SHOWMINIMIZED.0 as u32 {
        let _ = ShowWindow(hwnd, SW_RESTORE);
    }
    keybd_event(VK_MENU.0 as u8, 0, KEYBD_EVENT_FLAGS(0), 0);
    std::thread::sleep(std::time::Duration::from_millis(50));
    keybd_event(VK_MENU.0 as u8, 0, KEYEVENTF_KEYUP, 0);
    let _ = SetForegroundWindow(hwnd);
}

fn change_volume(step: i32) -> Result<u32, String> {
    use windows::Win32::Media::Audio::{
        IMMDeviceEnumerator, MMDeviceEnumerator, eRender, eConsole,
    };
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("CoCreateInstance MMDeviceEnumerator failed: {}", e))?;

        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| format!("GetDefaultAudioEndpoint failed: {}", e))?;

        let endpoint: IAudioEndpointVolume = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Activate IAudioEndpointVolume failed: {}", e))?;

        let current = endpoint
            .GetMasterVolumeLevelScalar()
            .map_err(|e| format!("GetMasterVolumeLevelScalar failed: {}", e))?;

        let new_level = ((current * 100.0) + step as f32).clamp(0.0, 100.0) / 100.0;
        endpoint
            .SetMasterVolumeLevelScalar(new_level, std::ptr::null())
            .map_err(|e| format!("SetMasterVolumeLevelScalar failed: {}", e))?;

        Ok((new_level * 100.0).round() as u32)
    }
}

#[raycast]
fn volume_up(step: u32) -> Result<u32, String> {
    change_volume(step as i32)
}

#[raycast]
fn volume_down(step: u32) -> Result<u32, String> {
    change_volume(-(step as i32))
}

fn extract_exe_names(app_id: &str) -> Vec<String> {
    let mut names = Vec::new();

    if app_id.ends_with(".exe") {
        names.push(app_id.trim_end_matches(".exe").to_lowercase());
        return names;
    }

    names.push(app_id.to_lowercase());

    if let Some(after_bang) = app_id.split('!').nth(1) {
        let s = after_bang.to_lowercase();
        if !s.is_empty() {
            names.push(s);
        }
    }

    let main_part = app_id.split('!').next().unwrap_or(app_id);
    let clean_part = main_part.split('_').next().unwrap_or(main_part);

    names.push(clean_part.to_lowercase());

    for segment in clean_part.split('.') {
        let s = segment.to_lowercase();
        if !s.is_empty() {
            names.push(s);
        }
    }

    if let Some(last) = app_id.rsplit('.').next() {
        let s = last.to_lowercase();
        if s.len() >= 3 && !names.contains(&s) {
            names.push(s);
        }
    }

    names
}

fn get_session_manager() -> Result<GlobalSystemMediaTransportControlsSessionManager, String> {
    GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| format!("RequestAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Get session manager failed: {}", e))
}

fn format_app_name(app_id: &str) -> String {
    if app_id.is_empty() {
        return "Unknown".to_string();
    }

    if app_id.contains('!') {
        let part = app_id.split('!').next().unwrap_or(app_id);
        if part.contains('_') {
            let before = part.split('_').next().unwrap_or(part).to_string();
            before.rsplit('.').next().filter(|s| s.len() < 20).unwrap_or(&before).to_string()
        } else {
            part.rsplit('.').next().filter(|s| s.len() < 20).unwrap_or(part).to_string()
        }
    } else if app_id.ends_with(".exe") {
        app_id.trim_end_matches(".exe").to_string()
    } else {
        // For "Helium.HASH" format, pick the shortest readable segment (< 20 chars)
        let name = app_id.split('.').find(|s| !s.is_empty() && s.len() < 20).unwrap_or(app_id).to_string();
        name
    }
}
