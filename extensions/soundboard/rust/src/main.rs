use raycast_rust_macros::raycast;

#[cfg(windows)]
use windows::Media::Playback::MediaPlayer;
#[cfg(windows)]
use windows::Win32::Foundation::HANDLE;

// Owns the stop event handle and releases it when dropped, so the handle is
// always closed regardless of how `play_windows` returns (including via `?`
// early-returns when media-player setup fails).
#[cfg(windows)]
struct StopEventGuard(HANDLE);

#[cfg(windows)]
impl Drop for StopEventGuard {
    fn drop(&mut self) {
        unsafe {
            let _ = windows::Win32::Foundation::CloseHandle(self.0);
        }
    }
}

// Owns the MediaPlayer and tears it down when dropped on every return path:
// Pause stops the audio immediately and Close releases the player instead of
// relying on Drop/Release alone, which can otherwise leave audio playing after
// a Stop.
#[cfg(windows)]
struct PlayerGuard(MediaPlayer);

#[cfg(windows)]
impl Drop for PlayerGuard {
    fn drop(&mut self) {
        let _ = self.0.Pause();
        let _ = self.0.Close();
    }
}

#[raycast]
fn play_file(path: String, token: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        play_windows(&path, &token)
    }

    #[cfg(not(windows))]
    {
        Err("Sound playback is not supported on this platform".to_string())
    }
}

#[raycast]
fn stop_file(path: String, token: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        stop_windows(&path, &token)
    }

    #[cfg(not(windows))]
    {
        Err("Sound playback is not supported on this platform".to_string())
    }
}

#[cfg(windows)]
fn play_windows(path: &str, token: &str) -> Result<(), String> {
    use std::sync::mpsc;
    use std::time::Duration;
    use windows::core::HSTRING;
    use windows::Foundation::TypedEventHandler;
    use windows::Media::Core::MediaSource;
    use windows::Win32::Foundation::WAIT_OBJECT_0;
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
    use windows::Win32::System::Threading::WaitForSingleObject;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }

    // Every playback instance owns a dedicated, token-named stop event, so a
    // new play of the same file can never inherit or erase a Stop that was
    // signalled for an older player (and the older player can never cancel the
    // new play). The guard releases the handle on every return path, so a setup
    // error below never leaks the event as an active-playback signal.
    let stop_event = create_stop_event(&stop_event_name(path, token))?;
    let _stop_event_guard = StopEventGuard(stop_event);

    // Open the file through StorageFile instead of a raw URI: MF refuses a
    // byte-stream handler for the `file:///` scheme on desktop with
    // MF_E_UNSUPPORTED_BYTESTREAM_TYPE, whereas the storage-backed source
    // resolves reliably and still handles paths containing spaces.
    let file = windows::Storage::StorageFile::GetFileFromPathAsync(&HSTRING::from(path))
        .map_err(|e| format!("Failed to open file: {e}"))?
        .get()
        .map_err(|e| format!("Failed to open file: {e}"))?;
    use windows::core::Interface;
    let file: windows::Storage::IStorageFile = file.cast().map_err(|e| format!("Failed to open file: {e}"))?;
    let source = windows::Media::Core::MediaSource::CreateFromStorageFile(&file)
        .map_err(|e| format!("Failed to create media source: {e}"))?;

    let player = MediaPlayer::new().map_err(|e| format!("Failed to create MediaPlayer: {e}"))?;
    // The guard Pause + Close()s the player on every return path so audio stops
    // immediately when a Stop fires or playback ends.
    let _player_guard = PlayerGuard(player);
    _player_guard.0.SetAutoPlay(true).map_err(|e| e.to_string())?;
    _player_guard.0.SetSource(&source).map_err(|e| e.to_string())?;

    let (tx, rx) = mpsc::channel::<()>();
    let ended_token = _player_guard
        .0
        .MediaEnded(&TypedEventHandler::new(move |_sender, _args| {
            let _ = tx.send(());
            Ok(())
        }))
        .map_err(|e| e.to_string())?;

    _player_guard.0.Play().map_err(|e| e.to_string())?;

    let session = _player_guard.0.PlaybackSession().map_err(|e| e.to_string())?;
    let duration = session.NaturalDuration().map_err(|e| e.to_string())?.Duration;
    let mut last_position = -1i64;
    let mut stalled_ticks = 0u32;

    loop {
        match rx.recv_timeout(Duration::from_millis(200)) {
            Ok(()) | Err(mpsc::RecvTimeoutError::Disconnected) => break,
            Err(mpsc::RecvTimeoutError::Timeout) => {}
        }

        // Check whether a stop was requested for this file.
        if unsafe { WaitForSingleObject(stop_event, 0) } == WAIT_OBJECT_0 {
            break;
        }

        let position = session.Position().map_err(|e| e.to_string())?.Duration;
        if duration > 0 && position >= duration {
            break;
        }
        if position == last_position {
            stalled_ticks += 1;
            if stalled_ticks > 25 {
                break;
            }
        } else {
            last_position = position;
            stalled_ticks = 0;
        }
    }

    let _ = _player_guard.0.RemoveMediaEnded(ended_token);
    Ok(())
}

#[raycast]
fn is_playing(path: String, token: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        Ok(is_playing_windows(&path, &token))
    }

    #[cfg(not(windows))]
    {
        Ok(false)
    }
}

#[cfg(windows)]
fn stop_windows(path: &str, token: &str) -> Result<(), String> {
    use windows::core::HSTRING;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{OpenEventW, SetEvent, EVENT_MODIFY_STATE};

    let event_name = stop_event_name(path, token);
    let event = unsafe { OpenEventW(EVENT_MODIFY_STATE, false, &HSTRING::from(&event_name)) };
    let Ok(event) = event else {
        // No player is currently running for this file.
        return Ok(());
    };

    unsafe {
        let _ = SetEvent(event);
        let _ = CloseHandle(event);
    }
    Ok(())
}

#[cfg(windows)]
fn is_playing_windows(path: &str, token: &str) -> bool {
    use windows::core::HSTRING;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{OpenEventW, EVENT_MODIFY_STATE};

    let event_name = stop_event_name(path, token);
    let event = unsafe { OpenEventW(EVENT_MODIFY_STATE, false, &HSTRING::from(&event_name)) };
    let Ok(event) = event else {
        // No player process is currently running for this file.
        return false;
    };

    unsafe {
        let _ = CloseHandle(event);
    }
    true
}

#[cfg(windows)]
fn stop_event_name(path: &str, token: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    token.hash(&mut hasher);
    format!("Local\\RaycastSoundboard_{:016x}", hasher.finish())
}

#[cfg(windows)]
fn create_stop_event(event_name: &str) -> Result<HANDLE, String> {
    use windows::core::HSTRING;
    use windows::Win32::System::Threading::CreateEventW;

    unsafe { CreateEventW(None, true, false, &HSTRING::from(event_name)).map_err(|e| e.to_string()) }
}
