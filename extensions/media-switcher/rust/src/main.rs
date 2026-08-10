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
    pub session_index: u32,
    pub title_prefix: String,
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
    let mut app_index: std::collections::HashMap<String, u32> = std::collections::HashMap::new();

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

        let idx = app_index.entry(app_id.clone()).or_insert(0);
        let session_index = *idx;
        *idx += 1;

        let props = session
            .TryGetMediaPropertiesAsync()
            .map_err(|e| format!("TryGetMediaPropertiesAsync failed: {}", e))?
            .get()
            .map_err(|e| format!("Get media properties failed: {}", e))?;

        let title = props.Title().map_err(|e| format!("Title failed: {}", e))?.to_string();
        let artist = props.Artist().map_err(|e| format!("Artist failed: {}", e))?.to_string();
        let title_prefix = title.chars().take(30).collect::<String>();

        let info = session.GetPlaybackInfo().map_err(|e| format!("GetPlaybackInfo failed: {}", e))?;
        let status = info.PlaybackStatus().map_err(|e| format!("PlaybackStatus failed: {}", e))?;
        let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

        result.push(MediaSessionInfo {
            app_id: app_id.clone(),
            session_index,
            title_prefix,
            app_name: format_app_name(&app_id),
            title,
            artist,
            is_playing,
        });

        iterator.MoveNext().map_err(|e| format!("MoveNext failed: {}", e))?;
    }

    Ok(result)
}

// The Windows Media Transport Controls API does not expose stable per-session IDs.
// Session identity uses (app_id + ordinal within app) captured at render time,
// resolved against a fresh snapshot via resolve_target_index — the exact same
// identity logic find_session_by_index uses, so switching never falls back to a
// weaker matcher.
//
// Order of operations avoids ever playing two sessions at once:
//   1. Pause every competing session and confirm each reached Paused.
//   2. Only then start the target and confirm it reached Playing.
// If any competitor can't be confirmed paused, the target is never started and
// the sessions we did pause are resumed (pause is reversible — re-playing puts
// them back in the state we found them in). If the target fails to start, the
// already-paused competitors are resumed the same way.
#[raycast]
fn switch_session(target_app_id: String, target_index: u32, target_title_prefix: String) -> Result<(), String> {
    // One snapshot, used for both resolving the target and pausing competitors —
    // a second GetSessions() between the two would reintroduce a race window.
    let entries = snapshot_sessions()?;
    let target_pos = resolve_target_index(&entries, &target_app_id, target_index, &target_title_prefix)
        .ok_or_else(|| format!("Session {target_app_id}[{target_index}] not found or ambiguous — try refreshing"))?;

    // Phase 1: pause every competitor. Track every session whose pause request was
    // ACCEPTED — confirmed or not — because an accepted pause can still complete
    // after the confirmation poll times out, and rollback must restore it too.
    // Resuming a still-playing session later is a harmless no-op, so including
    // unconfirmed pauses in the rollback set is safe.
    let mut pause_attempted_positions: Vec<usize> = Vec::new();
    let mut pause_errors: Vec<String> = Vec::new();

    for (i, entry) in entries.iter().enumerate() {
        if i == target_pos {
            continue;
        }
        let label = format!("{}[{}]", entry.app_id, entry.ordinal);

        // Decide whether this competitor must be paused. An unreadable state is
        // treated as possibly-playing and still gets a pause attempt rather than
        // being silently skipped; only an actual pause failure surfaces as an error.
        let status = entry.session.GetPlaybackInfo().and_then(|info| info.PlaybackStatus());
        let should_pause = match &status {
            Ok(s) => *s == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing,
            Err(_) => true,
        };
        if !should_pause {
            continue;
        }

        let pause_result = match entry.session.TryPauseAsync() {
            Ok(op) => op.get().map(|_| ()).map_err(|e| format!("Pause request rejected: {}", e)),
            Err(e) => Err(format!("TryPauseAsync failed: {}", e)),
        };
        match pause_result {
            Ok(_) => {
                pause_attempted_positions.push(i);
                let mut paused = false;
                for _ in 0..50 {
                    if let Ok(info) = entry.session.GetPlaybackInfo() {
                        if let Ok(status) = info.PlaybackStatus() {
                            if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                                paused = true;
                                break;
                            }
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                if !paused {
                    pause_errors.push(format!("{} accepted pause but never reached paused state", label));
                }
            }
            Err(e) => pause_errors.push(format!("Failed to pause {}: {}", label, e)),
        }
    }

    // Starting the target while a competitor might still be playing would create
    // simultaneous playback. Undo what we paused and report instead.
    if !pause_errors.is_empty() {
        let resume_errors = resume_sessions(&entries, &pause_attempted_positions);
        let mut msg = format!("Could not pause all playing sessions: {}", pause_errors.join("; "));
        if !resume_errors.is_empty() {
            msg.push_str(&format!("; resume failures: {}", resume_errors.join("; ")));
        }
        return Err(msg);
    }

    // Phase 2: nothing else can be playing now — start the target. Any failure
    // (request rejected, immediate TryPlayAsync error, or state never reached)
    // resumes the paused competitors so the user's previous playback isn't left
    // interrupted; resume failures are reported alongside the switch error.
    let target_session = entries[target_pos].session.clone();
    let play_result = match target_session.TryPlayAsync() {
        Ok(op) => op.get().map(|_| ()).map_err(|e| format!("Play request rejected: {}", e)),
        Err(e) => Err(format!("TryPlayAsync failed: {}", e)),
    };
    let target_failure = match play_result {
        Ok(_) => {
            let mut started = false;
            for _ in 0..50 {
                if let Ok(info) = target_session.GetPlaybackInfo() {
                    if let Ok(status) = info.PlaybackStatus() {
                        if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                            started = true;
                            break;
                        }
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            if !started {
                Some("Target session did not start playing after switch".to_string())
            } else {
                None
            }
        }
        Err(e) => Some(format!("Failed to play target session: {}", e)),
    };

    if let Some(failure) = target_failure {
        let resume_errors = resume_sessions(&entries, &pause_attempted_positions);
        let mut msg = failure;
        if !resume_errors.is_empty() {
            msg.push_str(&format!("; resume failures: {}", resume_errors.join("; ")));
        }
        return Err(msg);
    }

    Ok(())
}

// Re-playing a session we just paused restores it — pause is reversible, so a
// paused SMTC session resumes from where it stopped. Used to undo the pause
// phase when the target can't be started, so competitors aren't left paused.
// Each resume is confirmed to actually reach Playing, matching the play path;
// an accepted request with no state transition is reported as a resume failure
// so interrupted playback isn't silently treated as restored.
fn resume_sessions(entries: &[SessionEntry], positions: &[usize]) -> Vec<String> {
    let mut errors = Vec::new();
    for &i in positions {
        let entry = &entries[i];
        let label = format!("{}[{}]", entry.app_id, entry.ordinal);
        let resume = match entry.session.TryPlayAsync() {
            Ok(op) => op.get().map(|_| ()).map_err(|e| format!("Play request rejected: {}", e)),
            Err(e) => Err(format!("TryPlayAsync failed: {}", e)),
        };
        match resume {
            Ok(_) => {
                let mut resumed = false;
                for _ in 0..50 {
                    if let Ok(info) = entry.session.GetPlaybackInfo() {
                        if let Ok(status) = info.PlaybackStatus() {
                            if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                                resumed = true;
                                break;
                            }
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                if !resumed {
                    errors.push(format!("{} accepted resume but never reached playing state", label));
                }
            }
            Err(e) => errors.push(format!("{}: {}", label, e)),
        }
    }
    errors
}

struct SessionEntry {
    session: GlobalSystemMediaTransportControlsSession,
    app_id: String,
    ordinal: u32,
    title: String,
}

// One walk over GetSessions(), computing per-app ordinals the same way
// list_sessions does and capturing each session's title. Every control action
// resolves its target from a single snapshot so ordinals can't shift between
// resolving and acting.
fn snapshot_sessions() -> Result<Vec<SessionEntry>, String> {
    let manager = get_session_manager()?;
    let sessions = manager.GetSessions().map_err(|e| format!("GetSessions failed: {}", e))?;
    let iterator = sessions.First().map_err(|e| format!("First failed: {}", e))?;

    let mut entries = Vec::new();
    let mut app_index: std::collections::HashMap<String, u32> = std::collections::HashMap::new();

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

        let idx = app_index.entry(app_id.clone()).or_insert(0);
        let ordinal = *idx;
        *idx += 1;

        let title = get_session_title(&session).unwrap_or_default();

        entries.push(SessionEntry {
            session,
            app_id,
            ordinal,
            title,
        });

        iterator.MoveNext().map_err(|e| format!("MoveNext failed: {}", e))?;
    }

    Ok(entries)
}

// Resolve which snapshot entry the user clicked. GetSessions() has no documented
// ordering guarantee and sessions expose no stable ID, so identity is a per-app
// ordinal with a title-prefix fingerprint. Priority:
//   empty title — Windows supplied no title, so there is no fingerprint to verify.
//     The click was keyed by (app_id, ordinal). Resolved ONLY when this app has a
//     single session in the snapshot: with no sibling, nothing could have
//     reassigned the clicked ordinal. If the app has two or more same-app
//     sessions, the ordinal's new occupant is indistinguishable from the clicked
//     one and we refuse (guess-free).
//   1. Exact (ordinal + title) match — the confident happy path, and the only
//      safe resolution when multiple same-app sessions share a title prefix.
//   2. Exactly one session matches the title fingerprint — it moved ordinals
//      (a sibling closed, order changed). Trust the title, not the number.
//   Otherwise unmatched or ambiguous (two+ sessions share the prefix) → None.
//   There is deliberately NO ordinal-only fallback for non-empty titles: when no
//   session matches the title, an ordinal match cannot distinguish "the selected
//   session track-skipped" from "the selected session closed and a sibling now
//   occupies its slot" — both present identically here — so guessing would risk
//   controlling the wrong session. Callers surface a "try refreshing" error.
fn resolve_target_index(
    entries: &[SessionEntry],
    target_app_id: &str,
    target_index: u32,
    target_title_prefix: &str,
) -> Option<usize> {
    if target_title_prefix.is_empty() {
        let mut ordinal_occupied: Option<usize> = None;
        let mut app_count = 0u32;
        for (i, entry) in entries.iter().enumerate() {
            if entry.app_id != target_app_id {
                continue;
            }
            app_count += 1;
            if entry.ordinal == target_index {
                ordinal_occupied = Some(i);
            }
        }
        // Untitled sessions can only be keyed by ordinal. That is safe only when
        // this app exposes exactly one session — a sibling opening, closing, or
        // reordering could otherwise move another session onto the clicked
        // ordinal. Otherwise refuse rather than control the wrong session.
        if app_count == 1 {
            return ordinal_occupied;
        }
        return None;
    }

    let mut title_matches: Vec<usize> = Vec::new();

    for (i, entry) in entries.iter().enumerate() {
        if entry.app_id != target_app_id {
            continue;
        }
        let title_ok = entry.title.starts_with(target_title_prefix);

        // 1. Exact (ordinal + title) match
        if entry.ordinal == target_index && title_ok {
            return Some(i);
        }
        if title_ok {
            title_matches.push(i);
        }
    }

    // 2. Unique title match at a (possibly shifted) ordinal
    if title_matches.len() == 1 {
        return title_matches[0].into();
    }

    None
}

#[raycast]
fn pause_session(target_app_id: String, target_index: u32, target_title_prefix: String) -> Result<(), String> {
    let session = find_session_by_index(&target_app_id, target_index, &target_title_prefix)?;
    session.TryPauseAsync()
        .map_err(|e| format!("TryPauseAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Pause request rejected: {}", e))?;
    let mut paused = false;
    for _ in 0..50 {
        if let Ok(info) = session.GetPlaybackInfo() {
            if let Ok(status) = info.PlaybackStatus() {
                if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                    paused = true;
                    break;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    if paused {
        Ok(())
    } else {
        Err("Session did not reach paused state".to_string())
    }
}

#[raycast]
fn play_session(target_app_id: String, target_index: u32, target_title_prefix: String) -> Result<(), String> {
    let session = find_session_by_index(&target_app_id, target_index, &target_title_prefix)?;
    session.TryPlayAsync()
        .map_err(|e| format!("TryPlayAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Play request rejected: {}", e))?;
    let mut started = false;
    for _ in 0..50 {
        if let Ok(info) = session.GetPlaybackInfo() {
            if let Ok(status) = info.PlaybackStatus() {
                if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                    started = true;
                    break;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    if started {
        Ok(())
    } else {
        Err("Session did not start playing".to_string())
    }
}

#[raycast]
fn previous_track(target_app_id: String, target_index: u32, target_title_prefix: String) -> Result<(), String> {
    let session = find_session_by_index(&target_app_id, target_index, &target_title_prefix)?;
    let old_title = get_session_title(&session)?;
    session.TrySkipPreviousAsync()
        .map_err(|e| format!("TrySkipPreviousAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Skip previous failed: {}", e))?;
    poll_title_change(&session, &old_title);
    Ok(())
}

#[raycast]
fn next_track(target_app_id: String, target_index: u32, target_title_prefix: String) -> Result<(), String> {
    let session = find_session_by_index(&target_app_id, target_index, &target_title_prefix)?;
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

// Session lookup for play/pause/skip actions. Thin wrapper over the shared
// snapshot + resolve logic so every control action uses the same identity
// rules switch_session does — no separate, weaker matcher to drift apart.
fn find_session_by_index(
    target_app_id: &str,
    target_index: u32,
    target_title_prefix: &str,
) -> Result<GlobalSystemMediaTransportControlsSession, String> {
    let entries = snapshot_sessions()?;
    let pos = resolve_target_index(&entries, target_app_id, target_index, target_title_prefix).ok_or_else(|| {
        format!("Session {target_app_id}[{target_index}] not found or ambiguous — try refreshing")
    })?;
    Ok(entries[pos].session.clone())
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
            let exe = full.split('\\').last().unwrap_or("").trim_end_matches(".exe");
            if names.contains(&exe.to_string()) || names.iter().any(|c| c.len() >= 4 && (exe.contains(c.as_str()) || c.contains(exe))) {
                FOUND_HWND.store(hwnd.0 as usize, Ordering::SeqCst);
                return BOOL(0);
            }
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

    // Adjust Apple User Model IDs to reflect the name the user actually sees.
    // Some internally-named AUMIDs (e.g. Windows 11 Media Player's legacy
    // "ZuneMusic" identifier) are confusing when shown verbatim.
    let overrides: &[(&str, &str)] = &[
        ("Microsoft.ZuneMusic_", "Media Player"),
        ("Microsoft.ZuneVideo_", "Movies & TV"),
        ("Microsoft.WindowsMediaPlayer_", "Windows Media Player"),
        ("com.spotify.client", "Spotify"),
    ];
    for (prefix, name) in overrides {
        if app_id.starts_with(prefix) {
            return name.to_string();
        }
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
        let name = app_id.split('.').find(|s| !s.is_empty() && s.len() < 20).unwrap_or(app_id).to_string();
        name
    }
}
