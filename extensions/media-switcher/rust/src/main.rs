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
    pub app_name: String,
    pub title: String,
    pub artist: String,
    pub is_playing: bool,
    // Exactly one of these is populated per session.
    pub exe_path: String,
    pub icon_path: String,
}

#[raycast]
fn list_sessions() -> Result<Vec<MediaSessionInfo>, String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
    };

    let manager = get_session_manager()?;
    let sessions = manager.GetSessions().map_err(|e| format!("GetSessions failed: {}", e))?;
    let iterator = sessions.First().map_err(|e| format!("First failed: {}", e))?;

    let mut procs: std::collections::HashMap<u32, (String, String, u32)> = std::collections::HashMap::new();
    let mut by_name: std::collections::HashMap<String, Vec<u32>> = std::collections::HashMap::new();
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
            .map_err(|e| format!("CreateToolhelp32Snapshot failed: {}", e))?;
        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let pid = entry.th32ProcessID;
                let raw = String::from_utf16_lossy(&entry.szExeFile).trim_end_matches('\0').to_string();
                let stem = raw.to_lowercase().trim_end_matches(".exe").to_string();
                procs.insert(pid, (stem.clone(), raw, entry.th32ParentProcessID));
                by_name.entry(stem).or_default().push(pid);
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }

    let mut result = Vec::new();
    let mut app_index: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let visible = unsafe { visible_window_pids() };

    // Fire every properties request up front so the wait is the slowest
    // session, not the sum.
    let mut pending = Vec::new();
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

        let props_op = session
            .TryGetMediaPropertiesAsync()
            .map_err(|e| format!("TryGetMediaPropertiesAsync failed: {}", e))?;
        pending.push((session, app_id, session_index, props_op));

        iterator.MoveNext().map_err(|e| format!("MoveNext failed: {}", e))?;
    }

    for (session, app_id, session_index, props_op) in pending {
        let props = props_op.get().map_err(|e| format!("Get media properties failed: {}", e))?;

        let title = props.Title().map_err(|e| format!("Title failed: {}", e))?.to_string();
        let artist = props.Artist().map_err(|e| format!("Artist failed: {}", e))?.to_string();

        let info = session.GetPlaybackInfo().map_err(|e| format!("GetPlaybackInfo failed: {}", e))?;
        let status = info.PlaybackStatus().map_err(|e| format!("PlaybackStatus failed: {}", e))?;
        let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

        // One-shot process: in-memory caches would die with it, so anything
        // beyond the process table and registry stays caller-side.
        let (exe_path, resolved_app_name) = if app_id.contains('!') {
            (String::new(), format_app_name(&app_id))
        } else {
            let exe_name = app_id.to_lowercase().trim_end_matches(".exe").to_string();
            let mut chosen: Option<(u32, String)> = None;
            if let Some(pids) = by_name.get(&exe_name) {
                for &pid in pids {
                    if visible.contains(&pid) {
                        chosen = procs.get(&pid).map(|(_, raw, _)| (pid, raw.clone()));
                        break;
                    }
                }
                if chosen.is_none() {
                    'host: for &pid in pids {
                        let mut cur = pid;
                        for _ in 0..8 {
                            let parent = match procs.get(&cur) {
                                Some((_, _, p)) if *p != 0 && *p != cur => *p,
                                _ => break,
                            };
                            if visible.contains(&parent) {
                                chosen = procs.get(&parent).map(|(_, raw, _)| (parent, raw.clone()));
                                break 'host;
                            }
                            cur = parent;
                        }
                    }
                }
                if chosen.is_none() {
                    if let Some(&first) = pids.first() {
                        chosen = procs.get(&first).map(|(_, raw, _)| (first, raw.clone()));
                    }
                }
            }

            match &chosen {
                Some((pid, raw)) => (unsafe { exe_path_from_pid(*pid) }.unwrap_or_default(), format_app_name(raw)),
                None => (unsafe { exe_path_from_aumid(&app_id) }.unwrap_or_default(), format_app_name(&app_id)),
            }
        };

        result.push(MediaSessionInfo {
            app_id: app_id.clone(),
            session_index,
            app_name: resolved_app_name,
            title,
            artist,
            is_playing,
            exe_path,
            icon_path: String::new(),
        });
    }

    Ok(result)
}

// SMTC exposes no stable per-session IDs; identity is (app_id + ordinal +
// exact metadata) via resolve_target_index, shared by every control action.
//
// Never play two sessions at once: pause + confirm every competitor first,
// and resume whatever was paused if anything downstream fails (pause is
// reversible, so resume restores the prior state).
#[raycast]
fn switch_session(
    target_app_id: String,
    target_index: u32,
    target_title: String,
    target_artist: String,
) -> Result<(), String> {
    // One snapshot for resolve + pause: a second GetSessions() between the
    // two would reintroduce a race window.
    let entries = snapshot_sessions()?;
    let target_pos = resolve_target_index(&entries, &target_app_id, target_index, &target_title, &target_artist, false)
        .ok_or_else(|| format!("Session {target_app_id}[{target_index}] not found or ambiguous — try refreshing"))?;

    // Track every ACCEPTED pause, confirmed or not: an accepted request can
    // still complete after the poll times out. Resuming a still-playing
    // session is a harmless no-op.
    let mut pause_attempted_positions: Vec<usize> = Vec::new();
    let mut pause_errors: Vec<String> = Vec::new();

    for (i, entry) in entries.iter().enumerate() {
        if i == target_pos {
            continue;
        }
        let label = format!("{}[{}]", entry.app_id, entry.ordinal);

        // Unreadable state reads as possibly-playing: attempt the pause, only
        // surface actual failures.
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
                for _ in 0..60 {
                    if let Ok(info) = entry.session.GetPlaybackInfo() {
                        if let Ok(status) = info.PlaybackStatus() {
                            if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                                paused = true;
                                break;
                            }
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(15));
                }
                if !paused {
                    pause_errors.push(format!("{} accepted pause but never reached paused state", label));
                }
            }
            Err(e) => pause_errors.push(format!("Failed to pause {}: {}", label, e)),
        }
    }

    if !pause_errors.is_empty() {
        let resume_errors = resume_sessions(&entries, &pause_attempted_positions);
        let mut msg = format!("Could not pause all playing sessions: {}", pause_errors.join("; "));
        if !resume_errors.is_empty() {
            msg.push_str(&format!("; resume failures: {}", resume_errors.join("; ")));
        }
        return Err(msg);
    }

    let target_session = entries[target_pos].session.clone();
    let play_result = match target_session.TryPlayAsync() {
        Ok(op) => op.get().map(|_| ()).map_err(|e| format!("Play request rejected: {}", e)),
        Err(e) => Err(format!("TryPlayAsync failed: {}", e)),
    };
    let target_failure = match play_result {
        Ok(_) => {
            let mut started = false;
            for _ in 0..60 {
                if let Ok(info) = target_session.GetPlaybackInfo() {
                    if let Ok(status) = info.PlaybackStatus() {
                        if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                            started = true;
                            break;
                        }
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(15));
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
                for _ in 0..60 {
                    if let Ok(info) = entry.session.GetPlaybackInfo() {
                        if let Ok(status) = info.PlaybackStatus() {
                            if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                                resumed = true;
                                break;
                            }
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(15));
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
    artist: String,
}

// One walk over GetSessions(), computing per-app ordinals the same way
// list_sessions does and capturing each session's title and artist. Every
// control action resolves its target from a single snapshot so ordinals can't
// shift between resolving and acting.
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

        let (title, artist) = get_session_title_artist(&session).unwrap_or_default();

        entries.push(SessionEntry {
            session,
            app_id,
            ordinal,
            title,
            artist,
        });

        iterator.MoveNext().map_err(|e| format!("MoveNext failed: {}", e))?;
    }

    Ok(entries)
}

// Identity is (app_id + ordinal + byte-identical title/artist). No
// ordinal-only or prefix fallback: those can't distinguish "track skipped"
// from "session closed and replaced", so guessing risks driving the wrong
// session. Empty fields must stay empty; two sessions with identical
// metadata are indistinguishable — SMTC exposes no session ID.
//   1. Exact match. 2. Unique metadata match at a shifted ordinal.
//   3. Single-session app, only when the caller opts in (see below).
fn resolve_target_index(
    entries: &[SessionEntry],
    target_app_id: &str,
    target_index: u32,
    target_title: &str,
    target_artist: &str,
    allow_single: bool,
) -> Option<usize> {
    if target_title.is_empty() {
        if target_artist.is_empty() {
            return None;
        }
        let mut artist_matches: Vec<usize> = Vec::new();
        for (i, entry) in entries.iter().enumerate() {
            if entry.app_id != target_app_id || !entry.title.is_empty() {
                continue;
            }
            let artist_ok = entry.artist == target_artist;
            if entry.ordinal == target_index && artist_ok {
                return Some(i);
            }
            if artist_ok {
                artist_matches.push(i);
            }
        }
        if artist_matches.len() == 1 {
            return artist_matches[0].into();
        }
        if allow_single {
            return single_app_session(entries, target_app_id);
        }
        return None;
    }

    let mut title_matches: Vec<usize> = Vec::new();

    for (i, entry) in entries.iter().enumerate() {
        if entry.app_id != target_app_id {
            continue;
        }
        let title_ok = entry.title == target_title;
        let artist_ok = entry.artist == target_artist;

        // 1. Exact (ordinal + title + artist) match
        if entry.ordinal == target_index && title_ok && artist_ok {
            return Some(i);
        }
        if title_ok && artist_ok {
            title_matches.push(i);
        }
    }

    // 2. Unique (title + artist) match at a (possibly shifted) ordinal
    if title_matches.len() == 1 {
        return title_matches[0].into();
    }

    if allow_single {
        return single_app_session(entries, target_app_id);
    }
    None
}

// 3. Opt-in last resort: the app has exactly one session, so app (+ ordinal)
// already identifies it — the metadata only drifted because the app moved
// faster than the UI refreshed (rapid prev/next). Zero sessions means it
// closed; two or more without a metadata match stays ambiguous. Scoped to
// momentary single-target actions: switch_session stays strict because it
// pauses other apps on the strength of a possibly stale click.
fn single_app_session(entries: &[SessionEntry], target_app_id: &str) -> Option<usize> {
    let mut found: Option<usize> = None;
    for (i, entry) in entries.iter().enumerate() {
        if entry.app_id != target_app_id {
            continue;
        }
        if found.is_some() {
            return None;
        }
        found = Some(i);
    }
    found
}

#[raycast]
fn pause_session(
    target_app_id: String,
    target_index: u32,
    target_title: String,
    target_artist: String,
) -> Result<(), String> {
    let session = find_session_by_index(&target_app_id, target_index, &target_title, &target_artist, true)?;
    session.TryPauseAsync()
        .map_err(|e| format!("TryPauseAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Pause request rejected: {}", e))?;
    let mut paused = false;
    for _ in 0..60 {
        if let Ok(info) = session.GetPlaybackInfo() {
            if let Ok(status) = info.PlaybackStatus() {
                if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
                    paused = true;
                    break;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(15));
    }
    if paused {
        Ok(())
    } else {
        Err("Session did not reach paused state".to_string())
    }
}

#[raycast]
fn play_session(
    target_app_id: String,
    target_index: u32,
    target_title: String,
    target_artist: String,
) -> Result<(), String> {
    let session = find_session_by_index(&target_app_id, target_index, &target_title, &target_artist, true)?;
    session.TryPlayAsync()
        .map_err(|e| format!("TryPlayAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Play request rejected: {}", e))?;
    let mut started = false;
    for _ in 0..60 {
        if let Ok(info) = session.GetPlaybackInfo() {
            if let Ok(status) = info.PlaybackStatus() {
                if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                    started = true;
                    break;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(15));
    }
    if started {
        Ok(())
    } else {
        Err("Session did not start playing".to_string())
    }
}

#[raycast]
fn previous_track(
    target_app_id: String,
    target_index: u32,
    target_title: String,
    target_artist: String,
) -> Result<(), String> {
    let session = find_session_by_index(&target_app_id, target_index, &target_title, &target_artist, true)?;
    let old_title = get_session_title(&session)?;
    session.TrySkipPreviousAsync()
        .map_err(|e| format!("TrySkipPreviousAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Skip previous failed: {}", e))?;
    poll_title_change(&session, &old_title);
    Ok(())
}

#[raycast]
fn next_track(
    target_app_id: String,
    target_index: u32,
    target_title: String,
    target_artist: String,
) -> Result<(), String> {
    let session = find_session_by_index(&target_app_id, target_index, &target_title, &target_artist, true)?;
    let old_title = get_session_title(&session)?;
    session.TrySkipNextAsync()
        .map_err(|e| format!("TrySkipNextAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Skip next failed: {}", e))?;
    poll_title_change(&session, &old_title);
    Ok(())
}

fn get_session_title_artist(session: &GlobalSystemMediaTransportControlsSession) -> Result<(String, String), String> {
    let props = session
        .TryGetMediaPropertiesAsync()
        .map_err(|e| format!("TryGetMediaPropertiesAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Get media properties failed: {}", e))?;
    let title = props.Title().map_err(|e| format!("Title failed: {}", e))?.to_string();
    let artist = props.Artist().map_err(|e| format!("Artist failed: {}", e))?.to_string();
    Ok((title, artist))
}

fn get_session_title(session: &GlobalSystemMediaTransportControlsSession) -> Result<String, String> {
    Ok(get_session_title_artist(session)?.0)
}

fn poll_title_change(session: &GlobalSystemMediaTransportControlsSession, old_title: &str) {
    for _ in 0..60 {
        if let Ok(props) = session.TryGetMediaPropertiesAsync().and_then(|op| op.get()) {
            if let Ok(title) = props.Title() {
                if title.to_string() != old_title {
                    return;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(15));
    }
}

fn find_session_by_index(
    target_app_id: &str,
    target_index: u32,
    target_title: &str,
    target_artist: &str,
    allow_single: bool,
) -> Result<GlobalSystemMediaTransportControlsSession, String> {
    let entries = snapshot_sessions()?;
    let pos = resolve_target_index(&entries, target_app_id, target_index, target_title, target_artist, allow_single)
        .ok_or_else(|| {
        format!("Session {target_app_id}[{target_index}] not found or ambiguous — try refreshing")
    })?;
    Ok(entries[pos].session.clone())
}

// Session artwork in a temp file. Empty path when the session offers none;
// the caller sizes the image from the dimensions.
#[derive(Serialize)]
pub struct SessionThumbnail {
    pub path: String,
    pub width: u32,
    pub height: u32,
    // Content hash, embedded in the filename: the renderer's image cache
    // ignores query strings, so only a unique path per byte-content defeats
    // stale art. Doubles as the settling flip signal caller-side.
    pub hash: String,
}

fn empty_thumbnail() -> SessionThumbnail {
    SessionThumbnail { path: String::new(), width: 0, height: 0, hash: String::new() }
}

fn fnv1a_hex(bytes: &[u8]) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in bytes {
        h ^= *b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    format!("{h:016x}")
}

// Header parsing avoids a decoding dependency for five formats.
fn image_dimensions(bytes: &[u8]) -> Option<(u32, u32)> {
    let nonzero = |w: u32, h: u32| (w > 0 && h > 0).then_some((w, h));

    // PNG: 8-byte signature, IHDR width/height as u32BE at 16..24.
    if bytes.len() >= 24 && bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        let w = u32::from_be_bytes(bytes[16..20].try_into().ok()?);
        let h = u32::from_be_bytes(bytes[20..24].try_into().ok()?);
        return nonzero(w, h);
    }
    // JPEG: scan segment markers for a Start-Of-Frame.
    if bytes.len() > 4 && bytes[0] == 0xFF && bytes[1] == 0xD8 {
        let mut i = 2;
        while i < bytes.len() {
            if bytes[i] != 0xFF {
                i += 1;
                continue;
            }
            let mut j = i + 1;
            while j < bytes.len() && bytes[j] == 0xFF {
                j += 1;
            }
            if j >= bytes.len() {
                break;
            }
            let marker = bytes[j];
            if marker == 0x00 || marker == 0x01 || (0xD0..=0xD9).contains(&marker) {
                i = j + 1;
                continue;
            }
            if j + 2 >= bytes.len() {
                break;
            }
            let seg_len = u16::from_be_bytes([bytes[j + 1], bytes[j + 2]]) as usize;
            if seg_len < 2 || j + 1 + seg_len > bytes.len() {
                break;
            }
            if (0xC0..=0xCF).contains(&marker) && ![0xC4, 0xC8, 0xCC].contains(&marker) && seg_len >= 8 {
                let h = u16::from_be_bytes([bytes[j + 4], bytes[j + 5]]) as u32;
                let w = u16::from_be_bytes([bytes[j + 6], bytes[j + 7]]) as u32;
                return nonzero(w, h);
            }
            i = j + 1 + seg_len;
        }
    }
    // GIF87a/89a: dimensions as u16LE at 6..10.
    if bytes.len() >= 10 && (bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a")) {
        let w = u16::from_le_bytes([bytes[6], bytes[7]]) as u32;
        let h = u16::from_le_bytes([bytes[8], bytes[9]]) as u32;
        return nonzero(w, h);
    }
    // BMP: DIB header size at 14; v3+ has i32LE dimensions at 18..26.
    if bytes.len() >= 26 && bytes.starts_with(b"BM") {
        let dib = u32::from_le_bytes(bytes[14..18].try_into().ok()?);
        if dib == 12 && bytes.len() >= 22 {
            let w = u16::from_le_bytes([bytes[18], bytes[19]]) as u32;
            let h = u16::from_le_bytes([bytes[20], bytes[21]]) as u32;
            return nonzero(w, h);
        } else if dib >= 40 {
            let w = i32::from_le_bytes(bytes[18..22].try_into().ok()?).unsigned_abs();
            let h = i32::from_le_bytes(bytes[22..26].try_into().ok()?).unsigned_abs();
            return nonzero(w, h);
        }
    }
    // WebP: "RIFF"...."WEBP", then a VP8/VP8L/VP8X chunk at 12.
    if bytes.len() >= 30 && bytes.starts_with(b"RIFF") && bytes[8..12] == *b"WEBP" {
        match &bytes[12..16] {
            b"VP8 " if bytes[23..26] == [0x9D, 0x01, 0x2A] => {
                let w = (u16::from_le_bytes([bytes[26], bytes[27]]) & 0x3FFF) as u32;
                let h = (u16::from_le_bytes([bytes[28], bytes[29]]) & 0x3FFF) as u32;
                return nonzero(w, h);
            }
            b"VP8L" if bytes[20] == 0x2F && bytes.len() >= 25 => {
                let b1 = bytes[21] as u32;
                let b2 = bytes[22] as u32;
                let b3 = bytes[23] as u32;
                let b4 = bytes[24] as u32;
                let w = 1 + (((b2 & 0x3F) << 8) | b1);
                let h = 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | (b2 >> 6));
                return nonzero(w, h);
            }
            b"VP8X" => {
                let w = 1 + u32::from_le_bytes([bytes[24], bytes[25], bytes[26], 0]);
                let h = 1 + u32::from_le_bytes([bytes[27], bytes[28], bytes[29], 0]);
                return nonzero(w, h);
            }
            _ => {}
        }
    }
    None
}
#[raycast]
fn session_thumbnail(
    target_app_id: String,
    target_index: u32,
    target_title: String,
    target_artist: String,
) -> Result<SessionThumbnail, String> {
    use windows::core::Interface;
    use windows::Storage::Streams::{DataReader, IInputStream};

    let session = find_session_by_index(&target_app_id, target_index, &target_title, &target_artist, true)?;
    let props = session
        .TryGetMediaPropertiesAsync()
        .map_err(|e| format!("TryGetMediaPropertiesAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Get media properties failed: {}", e))?;
    let thumb_ref = match props.Thumbnail() {
        Ok(r) => r,
        Err(_) => return Ok(empty_thumbnail()),
    };

    let stream = thumb_ref
        .OpenReadAsync()
        .map_err(|e| format!("Thumbnail OpenReadAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Thumbnail open failed: {}", e))?;
    let size = stream.Size().map_err(|e| format!("Thumbnail Size failed: {}", e))?;
    if size == 0 || size > 25_000_000 {
        return Ok(empty_thumbnail());
    }
    let input: IInputStream = stream.cast().map_err(|e| format!("Thumbnail cast failed: {}", e))?;
    let reader = DataReader::CreateDataReader(&input).map_err(|e| format!("CreateDataReader failed: {}", e))?;
    reader
        .LoadAsync(size as u32)
        .map_err(|e| format!("Thumbnail LoadAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("Thumbnail load failed: {}", e))?;
    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).map_err(|e| format!("Thumbnail ReadBytes failed: {}", e))?;

    let content_type = stream.ContentType().map(|c| c.to_string().to_lowercase()).unwrap_or_default();
    let ext = if content_type.contains("png") {
        "png"
    } else if content_type.contains("bmp") {
        "bmp"
    } else if content_type.contains("gif") {
        "gif"
    } else if content_type.contains("webp") {
        "webp"
    } else if content_type.contains("avif") {
        "avif"
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        "png"
    } else {
        "jpg"
    };

    // Unique path per byte-content (renderer ignores query strings);
    // superseded slot files are cleared — the caller holds no references
    // to gone sessions, so nothing rendered is deleted under it.
    let safe_id: String = target_app_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' { c } else { '_' })
        .take(60)
        .collect();
    let hash = fnv1a_hex(&bytes);
    let slot = format!("media-switcher-thumb-{safe_id}-{target_index}-");
    let file_name = format!("{slot}{hash}.{ext}");
    let dir = std::env::temp_dir();
    let path = dir.join(&file_name);
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&slot) && name != file_name {
                let _ = std::fs::remove_file(entry.path());
            }
        }
    }
    std::fs::write(&path, &bytes).map_err(|e| format!("Thumbnail write failed: {}", e))?;
    let (width, height) = image_dimensions(&bytes).unwrap_or((0, 0));
    Ok(SessionThumbnail {
        path: path.to_string_lossy().to_string(),
        width,
        height,
        hash,
    })
}

// AUMID registry key points at the exe — except some apps point it at a data
// folder, so only existing .exe paths are trusted.
unsafe fn exe_path_from_aumid(aumid: &str) -> Option<String> {
    use windows::core::HSTRING;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_CLASSES_ROOT, HKEY_CURRENT_USER,
        KEY_READ, REG_EXPAND_SZ, REG_SZ,
    };

    const ERROR_MORE_DATA: u32 = 234;

    let roots: &[(HKEY, &str)] = &[
        (HKEY_CURRENT_USER, "Software\\Classes\\AppUserModelId"),
        (HKEY_CLASSES_ROOT, "AppUserModelId"),
    ];

    for &(root, base) in roots {
        let subkey = HSTRING::from(format!("{}\\{}", base, aumid));
        let mut key = HKEY(std::ptr::null_mut());
        if !RegOpenKeyExW(root, &subkey, 0u32, KEY_READ, &mut key).is_ok() {
            continue;
        }

        let mut capacity = 256u32;
        loop {
            let mut buf = vec![0u16; capacity as usize];
            let mut bytes = (buf.len() * 2) as u32;
            let mut ty = REG_SZ;
            let result =
                RegQueryValueExW(key, None, None, Some(&mut ty), Some(buf.as_mut_ptr() as *mut u8), Some(&mut bytes));
            if result.0 == ERROR_MORE_DATA {
                capacity = ((bytes as usize / 2) + 1) as u32;
                continue;
            }
            let _ = RegCloseKey(key);
            if !result.is_ok() || (ty != REG_SZ && ty != REG_EXPAND_SZ) {
                break;
            }
            let value = String::from_utf16_lossy(&buf[..(bytes as usize / 2)]).trim_end_matches('\0').to_string();
            if !value.is_empty() && value.to_lowercase().ends_with(".exe") && std::path::Path::new(&value).is_file() {
                return Some(value);
            }
            break;
        }
    }
    None
}

unsafe fn exe_path_from_pid(pid: u32) -> Option<String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION, QueryFullProcessImageNameW,
    };

    let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
    let mut buf = [0u16; 1024];
    let mut size = buf.len() as u32;
    let ok = QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, windows::core::PWSTR(buf.as_mut_ptr()), &mut size);
    let _ = CloseHandle(handle);
    if ok.is_ok() && size > 0 {
        Some(String::from_utf16_lossy(&buf[..size as usize]).trim_end_matches('\0').to_string())
    } else {
        None
    }
}

// One EnumWindows pass; browsers spawn dozens of same-name processes.
unsafe fn visible_window_pids() -> std::collections::HashSet<u32> {
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM, TRUE};
    use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowThreadProcessId, IsWindowVisible};

    static mut FOUND: *mut std::collections::HashSet<u32> = std::ptr::null_mut();
    unsafe extern "system" fn cb(hwnd: HWND, _lparam: LPARAM) -> BOOL {
        if IsWindowVisible(hwnd).as_bool() {
            let mut wpid: u32 = 0;
            let _ = GetWindowThreadProcessId(hwnd, Some(&mut wpid));
            if !FOUND.is_null() {
                (*FOUND).insert(wpid);
            }
        }
        TRUE
    }
    let mut set = std::collections::HashSet::new();
    FOUND = &mut set;
    let _ = EnumWindows(Some(cb), LPARAM(0));
    FOUND = std::ptr::null_mut();
    set
}

fn collect_shortcuts(dir: &std::path::Path, out: &mut Vec<std::path::PathBuf>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_shortcuts(&path, out);
        } else if path.extension().map(|e| e.eq_ignore_ascii_case("lnk")).unwrap_or(false) {
            out.push(path);
        }
    }
}

// Built on demand by scan_shortcuts; the caller caches it (one-shot
// process, so the memo only dedupes within a single invocation). One entry
// per shortcut — several shortcuts may share an executable under different
// names, and the caller indexes every name.
fn start_menu_shortcuts() -> Vec<ShortcutEntry> {
    static CACHE: std::sync::Mutex<Option<Vec<ShortcutEntry>>> = std::sync::Mutex::new(None);
    if let Ok(guard) = CACHE.lock() {
        if let Some(entries) = guard.as_ref() {
            return entries.clone();
        }
    }

    let mut entries: Vec<ShortcutEntry> = Vec::new();
    use std::os::windows::ffi::OsStrExt;
    unsafe {
        use windows::core::{Interface, PCWSTR};
        use windows::Win32::Storage::FileSystem::WIN32_FIND_DATAW;
        use windows::Win32::System::Com::{
            CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
            IPersistFile,
        };
        use windows::Win32::UI::Shell::{
            FOLDERID_CommonPrograms, FOLDERID_Programs, IShellLinkW, KNOWN_FOLDER_FLAG, SHGetKnownFolderPath,
            ShellLink,
        };

        // S_FALSE / RPC_E_CHANGED_MODE are fine; the apartment is usable either way.
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        let mut files: Vec<std::path::PathBuf> = Vec::new();
        for folder in [&FOLDERID_Programs, &FOLDERID_CommonPrograms] {
            if let Ok(path) = SHGetKnownFolderPath(folder, KNOWN_FOLDER_FLAG(0), None) {
                collect_shortcuts(std::path::Path::new(&path.display().to_string()), &mut files);
                CoTaskMemFree(Some(path.as_ptr().cast()));
            }
        }

        let link: IShellLinkW = match CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER) {
            Ok(l) => l,
            Err(_) => return entries,
        };
        let persist: IPersistFile = match link.cast() {
            Ok(p) => p,
            Err(_) => return entries,
        };
        for lnk in files {
            let wide: Vec<u16> = lnk.as_os_str().encode_wide().chain(Some(0)).collect();
            if persist.Load(PCWSTR(wide.as_ptr()), windows::Win32::System::Com::STGM(0)).is_err() {
                continue;
            }
            let mut target = [0u16; 260];
            let mut fd = WIN32_FIND_DATAW::default();
            if link.GetPath(&mut target, &mut fd, 0).is_err() {
                continue;
            }
            let len = target.iter().position(|c| *c == 0).unwrap_or(target.len());
            let exe_path = String::from_utf16_lossy(&target[..len]);
            if exe_path.is_empty() || !exe_path.to_lowercase().ends_with(".exe") {
                continue;
            }
            if let Some(stem) = lnk.file_stem().and_then(|s| s.to_str()) {
                entries.push(ShortcutEntry { exe_path, name: stem.to_string() });
            }
        }
    }

    if let Ok(mut guard) = CACHE.lock() {
        *guard = Some(entries.clone());
    }
    entries
}

#[derive(Serialize, Clone)]
pub struct ShortcutEntry {
    pub exe_path: String,
    pub name: String,
}

// Flat entry list: the d.ts generator mangles HashMap<String, String>, so
// maps cross the bridge as entries and the caller rebuilds both directions.
#[raycast]
fn scan_shortcuts() -> Result<Vec<ShortcutEntry>, String> {
    Ok(start_menu_shortcuts())
}

#[raycast]
fn packaged_app_icon_for(app_id: String) -> Result<String, String> {
    Ok(packaged_app_icon(&app_id).unwrap_or_default())
}

fn xml_attr(manifest: &str, attr: &str) -> Option<String> {
    let needle = format!("{}=\"", attr);
    let start = manifest.find(&needle)? + needle.len();
    let end = start + manifest[start..].find('"')?;
    Some(manifest[start..end].replace('/', "\\"))
}

// Highest wins: nearest targetsize to 32px, then scale-200, then bare logo;
// theme/contrast/light variants lose.
fn asset_score(name: &str) -> u32 {
    let lower = name.to_lowercase();
    let parse_suffix = |marker: &str| -> Option<i32> {
        lower
            .split(marker)
            .nth(1)
            .map(|rest| rest.chars().take_while(|c| c.is_ascii_digit()).collect::<String>())
            .and_then(|digits| digits.parse::<i32>().ok())
    };
    let mut score = match (parse_suffix("targetsize-"), parse_suffix("scale-")) {
        (Some(ts), _) => ((ts - 32).abs() * 10) as u32 + 10,
        (None, Some(sc)) => ((200 - sc).abs() * 10) as u32 + 100,
        _ => 500,
    };
    if lower.contains("altform-unplated") && !lower.contains("lightunplated") {
        score = score.saturating_sub(5);
    }
    if lower.contains("lightunplated") {
        score += 30;
    }
    if lower.contains("theme-light") || lower.contains("theme-dark") {
        score += 50;
    }
    if lower.contains("contrast-") {
        score += 300;
    }
    score
}

fn pick_best_logo_asset(base: &std::path::Path) -> Option<String> {
    let stem = base.file_stem()?.to_str()?.to_string();
    let dir = base.parent()?;
    let mut best: Option<(u32, std::path::PathBuf)> = None;
    for entry in std::fs::read_dir(dir).ok()?.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else { continue };
        if !name.starts_with(&stem) || !name.to_lowercase().ends_with(".png") {
            continue;
        }
        let score = asset_score(name);
        if best.as_ref().map(|(s, _)| score < *s).unwrap_or(true) {
            best = Some((score, path));
        }
    }
    best?.1.to_str().map(|s| s.to_string())
}


fn packaged_app_icon(app_id: &str) -> Option<String> {
    use windows::core::{HSTRING, PWSTR};
    use windows::Win32::Foundation::{ERROR_INSUFFICIENT_BUFFER, ERROR_SUCCESS};
    use windows::Win32::Storage::Packaging::Appx::{GetPackagePathByFullName, GetPackagesByPackageFamily};

    if !app_id.contains('!') {
        return None;
    }
    let pfn = app_id.split('!').next()?;
    if pfn.is_empty() || !pfn.contains('_') {
        return None;
    }

    let pfn_h = HSTRING::from(pfn);
    let mut count = 0u32;
    let mut names_len = 0u32;
    // The sizing call reports ERROR_INSUFFICIENT_BUFFER while filling the lengths.
    let sized_err = unsafe { GetPackagesByPackageFamily(&pfn_h, &mut count, None, &mut names_len, PWSTR::null()) };
    if (sized_err != ERROR_SUCCESS && sized_err != ERROR_INSUFFICIENT_BUFFER) || count == 0 || names_len == 0 {
        return None;
    }
    let mut names_buf = vec![0u16; names_len as usize];
    let mut name_ptrs: Vec<PWSTR> = vec![PWSTR::null(); count as usize];
    let listed_err = unsafe {
        GetPackagesByPackageFamily(
            &pfn_h,
            &mut count,
            Some(name_ptrs.as_mut_ptr()),
            &mut names_len,
            PWSTR(names_buf.as_mut_ptr()),
        )
    };
    if listed_err != ERROR_SUCCESS {
        return None;
    }
    let full_names: Vec<String> = String::from_utf16_lossy(&names_buf)
        .split('\0')
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();

    for full in full_names {
        let full_h = HSTRING::from(full.as_str());
        let mut path_len = 0u32;
        let sized_path_err = unsafe { GetPackagePathByFullName(&full_h, &mut path_len, PWSTR::null()) };
        if (sized_path_err != ERROR_SUCCESS && sized_path_err != ERROR_INSUFFICIENT_BUFFER) || path_len == 0 {
            continue;
        }
        let mut path_buf = vec![0u16; path_len as usize];
        let path_err =
            unsafe { GetPackagePathByFullName(&full_h, &mut path_len, PWSTR(path_buf.as_mut_ptr())) };
        if path_err != ERROR_SUCCESS {
            continue;
        }
        let root = String::from_utf16_lossy(&path_buf);
        let root = root.trim_end_matches('\0');
        let Ok(manifest) = std::fs::read_to_string(std::path::Path::new(root).join("AppxManifest.xml")) else {
            continue;
        };
        let Some(rel) = xml_attr(&manifest, "Square44x44Logo").or_else(|| xml_attr(&manifest, "Logo")) else {
            continue;
        };
        let base = std::path::Path::new(root).join(rel);
        if let Some(icon) = pick_best_logo_asset(&base) {
            return Some(icon);
        }
    }
    None
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
        let mut parents: std::collections::HashMap<u32, u32> = std::collections::HashMap::new();
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
                parents.insert(entry.th32ProcessID, entry.th32ParentProcessID);
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

            let mut ancestors: Vec<u32> = Vec::new();
            for &pid in &pids {
                let mut cur = pid;
                for _ in 0..8 {
                    let parent = match parents.get(&cur) {
                        Some(&p) if p != 0 && p != cur => p,
                        _ => break,
                    };
                    ancestors.push(parent);
                    cur = parent;
                }
            }
            for &pid in &ancestors {
                TARGET_PID.store(pid as usize, Ordering::SeqCst);
                FOUND_HWND.store(0, Ordering::SeqCst);
                let _ = EnumWindows(Some(enum_by_pid), LPARAM(0));
                if FOUND_HWND.load(Ordering::SeqCst) != 0 {
                    let hwnd = HWND(FOUND_HWND.load(Ordering::SeqCst) as *mut _);
                    bring_to_front(hwnd);
                    return Ok(());
                }
            }

            for pid in pids.iter().chain(ancestors.iter()) {
                if let Some(path) = exe_path_from_pid(*pid) {
                    let r = ShellExecuteW(None, &HSTRING::from("open"), &HSTRING::from(&path), None, None, SW_SHOWNORMAL);
                    if (r.0 as isize) > 32 {
                        return Ok(());
                    }
                }
            }
        }

        if let Some(exe_path) = exe_path_from_aumid(&target_app_id) {
            let r = ShellExecuteW(None, &HSTRING::from("open"), &HSTRING::from(&exe_path), None, None, SW_SHOWNORMAL);
            if (r.0 as isize) > 32 {
                return Ok(());
            }
        }

        // Packaged apps launch via shell:AppsFolder.
        let mut last_error: isize;
        let path = format!("shell:AppsFolder\\{}", target_app_id);
        let result = ShellExecuteW(None, &HSTRING::from("open"), &HSTRING::from(&path), None, None, SW_SHOWNORMAL);
        last_error = result.0 as isize;
        if last_error <= 32 {
            let r = ShellExecuteW(None, &HSTRING::from("open"), &HSTRING::from(&target_app_id), None, None, SW_SHOWNORMAL);
            if (r.0 as isize) > 32 {
                return Ok(());
            }
            last_error = r.0 as isize;
            if !target_app_id.to_lowercase().ends_with(".exe") {
                let exe_candidate = format!("{}.exe", target_app_id);
                let r = ShellExecuteW(None, &HSTRING::from("open"), &HSTRING::from(&exe_candidate), None, None, SW_SHOWNORMAL);
                if (r.0 as isize) > 32 {
                    return Ok(());
                }
                last_error = r.0 as isize;
            }
        }
        if last_error <= 32 {
            return Err(format!(
                "Could not reveal {}: no window, process, or launchable AppUserModelId found (last error code: {})",
                target_app_id, last_error
            ));
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
    // Alt-tap settle so SetForegroundWindow isn't treated as a background steal. Keep at 50ms.
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
