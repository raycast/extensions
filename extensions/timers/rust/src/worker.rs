use crate::WorkerConfig;
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    os::windows::{fs::OpenOptionsExt, process::CommandExt},
    path::Path,
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicU8, Ordering},
        Arc,
    },
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use windows::{
    core::{HSTRING, PWSTR},
    Data::Xml::Dom::XmlDocument,
    Foundation::TypedEventHandler,
    Media::{
        Core::MediaSource,
        Playback::{MediaPlayer, MediaPlayerFailedEventArgs},
        SpeechSynthesis::SpeechSynthesizer,
    },
    Storage::StorageFile,
    Win32::{
        Foundation::{CloseHandle, ERROR_SUCCESS, HANDLE},
        Storage::Packaging::Appx::GetApplicationUserModelId,
        System::{
            Diagnostics::ToolHelp::{
                CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
                TH32CS_SNAPPROCESS,
            },
            Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION},
            WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED},
        },
    },
    UI::Notifications::{ToastNotification, ToastNotificationManager},
};

const CREATE_NO_WINDOW: u32 = 0x08000000;
const CREATE_BREAKAWAY_FROM_JOB: u32 = 0x01000000;

fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn sidecar(config: &WorkerConfig, suffix: &str) -> String {
    format!("{}.{}.{}", config.timer_file, config.worker_id, suffix)
}
fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
fn active(config: &WorkerConfig) -> bool {
    fs::read(&config.timer_file)
        .ok()
        .and_then(|data| serde_json::from_slice::<serde_json::Value>(&data).ok())
        .is_some_and(|timer| {
            timer["workerId"].as_str() == Some(&config.worker_id)
                && timer["lastPaused"].as_str() == Some("---")
        })
}
fn validate(config: &WorkerConfig) -> Result<(), String> {
    if !Path::new(&config.timer_file).is_absolute() || !config.timer_file.ends_with(".timer") {
        return Err("Invalid timer file".into());
    }
    if config.worker_id.is_empty()
        || !config
            .worker_id
            .chars()
            .all(|c| c.is_ascii_hexdigit() || c == '-')
    {
        return Err("Invalid worker identifier".into());
    }
    validate_volume(config.volume)?;
    if !config.speak && !Path::new(&config.sound_path).is_file() {
        return Err("Alert sound is missing".into());
    }
    Ok(())
}
fn validate_volume(volume: f64) -> Result<(), String> {
    if !volume.is_finite() || !(0.0..=1.0).contains(&volume) {
        Err("Alert volume must be between 0 and 1".into())
    } else {
        Ok(())
    }
}

pub fn ensure_timer_worker(config: WorkerConfig) -> Result<u32, String> {
    validate(&config)?;
    if !active(&config) {
        return Err("Timer was stopped or paused".into());
    }
    let lock_path = sidecar(&config, "lock");
    match OpenOptions::new()
        .create(true)
        .truncate(false)
        .write(true)
        .share_mode(0)
        .open(&lock_path)
    {
        Ok(lock) => drop(lock),
        Err(e) if e.raw_os_error() == Some(32) => {
            let started = Instant::now();
            while started.elapsed() < Duration::from_secs(5) {
                if let Some(pid) = fs::read_to_string(sidecar(&config, "ready"))
                    .ok()
                    .and_then(|pid| pid.parse().ok())
                {
                    return Ok(pid);
                }
                if !active(&config) {
                    return Err("Timer was stopped or paused".into());
                }
                thread::sleep(Duration::from_millis(25));
            }
            return Err("Existing timer worker did not become ready".into());
        }
        Err(e) => return Err(error(e)),
    }
    let ready = sidecar(&config, "ready");
    let _ = fs::remove_file(&ready);
    let _ = fs::remove_file(format!("{}.error", config.timer_file));
    let exe = std::env::current_exe().map_err(error)?;
    let spawn = |flags| {
        Command::new(&exe)
            .arg("timer_worker")
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(flags)
            .spawn()
    };
    // Escape an enclosing job where allowed; non-job processes need no breakaway flag.
    let mut child = spawn(CREATE_NO_WINDOW | CREATE_BREAKAWAY_FROM_JOB)
        .or_else(|_| spawn(CREATE_NO_WINDOW))
        .map_err(error)?;
    let input =
        serde_json::to_vec(&vec![serde_json::to_string(&config).map_err(error)?]).map_err(error)?;
    child
        .stdin
        .take()
        .ok_or("Worker stdin unavailable")?
        .write_all(&input)
        .map_err(error)?;
    let started = Instant::now();
    while started.elapsed() < Duration::from_secs(5) {
        if let Some(pid) = fs::read_to_string(&ready)
            .ok()
            .and_then(|pid| pid.parse().ok())
        {
            return Ok(pid);
        }
        if let Some(status) = child.try_wait().map_err(error)? {
            // A competing recovery worker may have won the file lock. Wait for its acknowledgement.
            if status.success() {
                thread::sleep(Duration::from_millis(25));
                continue;
            }
            return Err(fs::read_to_string(format!("{}.error", config.timer_file))
                .unwrap_or_else(|_| format!("Timer worker exited: {status}")));
        }
        thread::sleep(Duration::from_millis(25));
    }
    // Revoke this launch on timeout, so it cannot ring after a reported startup failure.
    let _ = child.kill();
    Err("Timer worker did not become ready".into())
}

struct Apartment;
impl Apartment {
    fn new() -> Result<Self, String> {
        unsafe {
            RoInitialize(RO_INIT_MULTITHREADED).map_err(error)?;
        }
        Ok(Self)
    }
}
impl Drop for Apartment {
    fn drop(&mut self) {
        unsafe {
            RoUninitialize();
        }
    }
}

// Close even when setup, playback, cancellation or a callback fails.
struct PlayerGuard(MediaPlayer);
impl Drop for PlayerGuard {
    fn drop(&mut self) {
        let _ = self.0.Pause();
        let _ = self.0.Close();
    }
}

fn make_player(path: &str, speak: bool, name: &str, volume: f64) -> Result<PlayerGuard, String> {
    validate_volume(volume)?;
    let source = if speak {
        let synthesizer = SpeechSynthesizer::new().map_err(error)?;
        let stream = synthesizer
            .SynthesizeTextToStreamAsync(&HSTRING::from(name))
            .map_err(error)?
            .get()
            .map_err(error)?;
        MediaSource::CreateFromStream(&stream, &stream.ContentType().map_err(error)?)
            .map_err(error)?
    } else {
        let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(path))
            .map_err(error)?
            .get()
            .map_err(error)?;
        MediaSource::CreateFromStorageFile(&file).map_err(error)?
    };
    let player = PlayerGuard(MediaPlayer::new().map_err(error)?);
    // Timer alerts are not music: do not publish Windows media transport sessions.
    player
        .0
        .CommandManager()
        .map_err(error)?
        .SetIsEnabled(false)
        .map_err(error)?;
    player
        .0
        .SystemMediaTransportControls()
        .map_err(error)?
        .SetIsEnabled(false)
        .map_err(error)?;
    player.0.SetVolume(volume).map_err(error)?;
    player.0.SetSource(&source).map_err(error)?;
    Ok(player)
}

fn play(player: &MediaPlayer, should_continue: impl Fn() -> bool) -> Result<(), String> {
    let status = Arc::new(AtomicU8::new(0));
    let ended_status = status.clone();
    let ended = player
        .MediaEnded(&TypedEventHandler::new(move |_, _| {
            ended_status.store(1, Ordering::SeqCst);
            Ok(())
        }))
        .map_err(error)?;
    let failed_status = status.clone();
    let failed = player
        .MediaFailed(
            &TypedEventHandler::<MediaPlayer, MediaPlayerFailedEventArgs>::new(move |_, _| {
                failed_status.store(2, Ordering::SeqCst);
                Ok(())
            }),
        )
        .map_err(error)?;
    let result = (|| {
        if !should_continue() {
            return Ok(());
        }
        player.Play().map_err(error)?;
        let started = Instant::now();
        let session = player.PlaybackSession().map_err(error)?;
        let mut position = 0;
        let mut progressed = Instant::now();
        while status.load(Ordering::SeqCst) == 0 && should_continue() {
            let current = session.Position().map_err(error)?.Duration;
            let duration = session.NaturalDuration().map_err(error)?.Duration;
            if duration > 0 && current >= duration {
                break;
            }
            if current != position {
                position = current;
                progressed = Instant::now();
            } else if progressed.elapsed() > Duration::from_secs(5) {
                return Err("Sound playback stopped making progress".into());
            }
            if started.elapsed() > Duration::from_secs(300) {
                return Err("Sound playback timed out".into());
            }
            thread::sleep(Duration::from_millis(100));
        }
        if status.load(Ordering::SeqCst) == 2 {
            Err("Windows could not play the alert sound".into())
        } else {
            Ok(())
        }
    })();
    let _ = player.Pause();
    let _ = player.RemoveMediaEnded(ended);
    let _ = player.RemoveMediaFailed(failed);
    result
}

fn escape_xml(text: &str) -> String {
    text.chars()
        .filter(|c| *c >= ' ' || matches!(*c, '\n' | '\r' | '\t'))
        .collect::<String>()
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
fn notify(app_id: &str, name: &str, tag: &str) -> Result<(), String> {
    if app_id.is_empty() {
        return Err("Raycast notification identity is unavailable".into());
    }
    let xml = XmlDocument::new().map_err(error)?;
    xml.LoadXml(&HSTRING::from(format!(
        "<toast><visual><binding template=\"ToastGeneric\"><text>Timer complete</text><text>{}</text></binding></visual><audio silent=\"true\"/></toast>", escape_xml(name)
    ))).map_err(error)?;
    let toast = ToastNotification::CreateToastNotification(&xml).map_err(error)?;
    toast
        .SetTag(&HSTRING::from(tag.chars().take(16).collect::<String>()))
        .map_err(error)?;
    toast.SetGroup(&HSTRING::from("timers")).map_err(error)?;
    let notifier = ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(app_id))
        .map_err(error)?;
    let setting = notifier.Setting().map_err(error)?;
    if setting != windows::UI::Notifications::NotificationSetting::Enabled {
        return Err(format!(
            "Windows has disabled Raycast notifications (setting {})",
            setting.0
        ));
    }
    notifier.Show(&toast).map_err(error)
}

pub fn run(config: WorkerConfig) -> Result<(), String> {
    validate(&config)?;
    let lock_path = sidecar(&config, "lock");
    // One owner per generation, including simultaneous recovery attempts from different commands.
    let lock: File = match OpenOptions::new()
        .create(true)
        .truncate(false)
        .write(true)
        .share_mode(0)
        .open(&lock_path)
    {
        Ok(lock) => lock,
        Err(e) if e.raw_os_error() == Some(32) => return Ok(()),
        Err(e) => return Err(error(e)),
    };
    let result = (|| {
        let _apartment = Apartment::new()?;
        if !active(&config) {
            return Ok(());
        }
        fs::write(sidecar(&config, "ready"), std::process::id().to_string()).map_err(error)?;
        while now_ms() < config.deadline {
            if !active(&config) {
                return Ok(());
            }
            thread::sleep(Duration::from_millis(100));
        }
        if !active(&config) {
            return Ok(());
        }
        let name = timer_name(&config);
        // Notification failure must not prevent the audible alert.
        let app_id = if config.notification_app_id.is_empty() {
            notification_app_id().unwrap_or_default()
        } else {
            config.notification_app_id.clone()
        };
        if let Err(e) = notify(&app_id, &name, &config.worker_id) {
            fs::write(
                format!("{}.error", config.timer_file),
                format!("Notification: {e}"),
            )
            .map_err(error)?;
        }
        loop {
            if !active(&config) {
                break;
            }
            {
                let player = make_player(
                    &config.sound_path,
                    config.speak,
                    &timer_name(&config),
                    config.volume,
                )?;
                play(&player.0, || active(&config))?;
            }
            if !config.ring_continuously || !active(&config) {
                break;
            }
            thread::sleep(Duration::from_millis(150));
        }
        // Keep failed alerts visible in Manage Timers, including notification errors.
        if active(&config)
            && !config.ring_continuously
            && !Path::new(&format!("{}.error", config.timer_file)).exists()
        {
            fs::remove_file(&config.timer_file).map_err(error)?;
        }
        Ok(())
    })();
    if let Err(ref e) = result {
        if active(&config) {
            let _ = fs::write(format!("{}.error", config.timer_file), e);
        }
    }
    let _ = fs::remove_file(sidecar(&config, "ready"));
    drop(lock);
    let _ = fs::remove_file(lock_path);
    result
}
fn timer_name(config: &WorkerConfig) -> String {
    fs::read(&config.timer_file)
        .ok()
        .and_then(|data| serde_json::from_slice::<serde_json::Value>(&data).ok())
        .and_then(|timer| timer["name"].as_str().map(str::to_owned))
        .unwrap_or_else(|| "Untitled".into())
}
pub fn preview(path: &str, speak: bool, volume: f64) -> Result<(), String> {
    let _apartment = Apartment::new()?;
    let player = make_player(path, speak, "Untitled Timer", volume)?;
    play(&player.0, || true)
}

fn preview_event_name(token: &str) -> Result<HSTRING, String> {
    if token.is_empty()
        || token.len() > 80
        || !token.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
    {
        return Err("Invalid playback token".into());
    }
    Ok(HSTRING::from(format!(
        "Local\\RaycastTimersPreview_{token}"
    )))
}

pub fn play_preview(path: &str, speak: bool, volume: f64, token: &str) -> Result<(), String> {
    use windows::Win32::{
        Foundation::WAIT_OBJECT_0,
        System::Threading::{CreateEventW, WaitForSingleObject},
    };
    let name = preview_event_name(token)?;
    let event = HandleGuard(unsafe { CreateEventW(None, true, false, &name).map_err(error)? });
    let _apartment = Apartment::new()?;
    let player = make_player(path, speak, "Untitled Timer", volume)?;
    play(&player.0, || unsafe {
        WaitForSingleObject(event.0, 0) != WAIT_OBJECT_0
    })
}

pub fn stop_preview(token: &str) -> Result<bool, String> {
    use windows::Win32::{
        Foundation::ERROR_FILE_NOT_FOUND,
        System::Threading::{OpenEventW, SetEvent, EVENT_MODIFY_STATE},
    };
    let name = preview_event_name(token)?;
    let event = match unsafe { OpenEventW(EVENT_MODIFY_STATE, false, &name) } {
        Ok(event) => HandleGuard(event),
        Err(e) if e.code() == windows::core::HRESULT::from_win32(ERROR_FILE_NOT_FOUND.0) => {
            return Ok(false)
        }
        Err(e) => return Err(error(e)),
    };
    unsafe {
        SetEvent(event.0).map_err(error)?;
    }
    Ok(true)
}

struct HandleGuard(HANDLE);
impl Drop for HandleGuard {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(self.0);
        }
    }
}

// Query the running packaged app, rather than depending on Raycast's application index.
pub fn notification_app_id() -> Result<String, String> {
    unsafe {
        let snapshot = HandleGuard(CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0).map_err(error)?);
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        Process32FirstW(snapshot.0, &mut entry).map_err(error)?;
        loop {
            let name = String::from_utf16_lossy(&entry.szExeFile);
            if name
                .trim_end_matches('\0')
                .eq_ignore_ascii_case("Raycast.exe")
            {
                if let Ok(handle) = OpenProcess(
                    PROCESS_QUERY_LIMITED_INFORMATION,
                    false,
                    entry.th32ProcessID,
                ) {
                    let process = HandleGuard(handle);
                    let mut buffer = [0u16; 512];
                    let mut length = buffer.len() as u32;
                    if GetApplicationUserModelId(process.0, &mut length, PWSTR(buffer.as_mut_ptr()))
                        == ERROR_SUCCESS
                    {
                        return Ok(String::from_utf16_lossy(
                            &buffer[..length.saturating_sub(1) as usize],
                        ));
                    }
                }
            }
            if Process32NextW(snapshot.0, &mut entry).is_err() {
                break;
            }
        }
    }
    Err("Cannot resolve the running Raycast app's Windows notification identity".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn xml_treats_names_as_text() {
        assert_eq!(escape_xml("茶 <&\"'\u{0}"), "茶 &lt;&amp;&quot;&apos;");
    }
    #[test]
    fn rejects_invalid_volume() {
        for value in [f64::NAN, f64::INFINITY, -0.1, 1.1] {
            assert!(validate_volume(value).is_err());
        }
        for value in [0.0, 0.5, 1.0] {
            assert!(validate_volume(value).is_ok());
        }
    }
    #[test]
    #[ignore = "plays muted audio and queries the live Windows media session manager"]
    fn alerts_do_not_publish_media_sessions_and_close_the_player() {
        use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;
        let _apartment = Apartment::new().unwrap();
        let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .unwrap()
            .get()
            .unwrap();
        let sessions = || {
            let entries = manager.GetSessions().unwrap();
            let mut ids = Vec::new();
            for i in 0..entries.Size().unwrap() {
                ids.push(
                    entries
                        .GetAt(i)
                        .unwrap()
                        .SourceAppUserModelId()
                        .unwrap()
                        .to_string(),
                );
            }
            ids.sort();
            ids
        };
        let before = sessions();
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../assets/pianoChime.wav")
            .canonicalize()
            .unwrap();
        let player = make_player(
            path.to_str().unwrap().trim_start_matches("\\\\?\\"),
            false,
            "Test",
            0.0,
        )
        .unwrap();
        assert!(!player.0.CommandManager().unwrap().IsEnabled().unwrap());
        assert!(!player
            .0
            .SystemMediaTransportControls()
            .unwrap()
            .IsEnabled()
            .unwrap());
        let retained = player.0.clone();
        play(&player.0, || {
            assert_eq!(sessions(), before);
            true
        })
        .unwrap();
        drop(player);
        assert!(
            retained.PlaybackSession().is_err(),
            "MediaPlayer must be closed, even if another reference remains"
        );
        thread::sleep(Duration::from_millis(500));
        assert_eq!(sessions(), before);
        preview("", true, 0.0).unwrap();
        assert_eq!(sessions(), before);
    }

    #[test]
    #[ignore = "sends one real notification; set RAYCAST_TIMERS_TEST_APP_ID explicitly"]
    fn notification_delivery_is_recorded_by_windows() {
        let app_id = notification_app_id().expect("running Raycast identity required");
        if let Ok(expected) = std::env::var("RAYCAST_TIMERS_TEST_APP_ID") {
            assert_eq!(app_id, expected);
        }
        let _apartment = Apartment::new().unwrap();
        let tag = format!("test{}", now_ms());
        let name = format!("Timers verification 茶 <& {tag}");
        notify(&app_id, &name, &tag).unwrap();
        let history = ToastNotificationManager::History().unwrap();
        let started = Instant::now();
        let mut found = false;
        while started.elapsed() < Duration::from_secs(5) {
            let entries = history.GetHistoryWithId(&HSTRING::from(&app_id)).unwrap();
            for index in 0..entries.Size().unwrap() {
                let entry = entries.GetAt(index).unwrap();
                if entry.Tag().unwrap().to_string() == tag.chars().take(16).collect::<String>() {
                    found = entry
                        .Content()
                        .unwrap()
                        .GetXml()
                        .unwrap()
                        .to_string()
                        .contains(&escape_xml(&name));
                }
            }
            if found {
                break;
            }
            thread::sleep(Duration::from_millis(100));
        }
        if std::env::var_os("RAYCAST_TIMERS_KEEP_TEST_NOTIFICATION").is_none() {
            history
                .RemoveGroupedTagWithId(
                    &HSTRING::from(tag.chars().take(16).collect::<String>()),
                    &HSTRING::from("timers"),
                    &HSTRING::from(&app_id),
                )
                .unwrap();
        }
        assert!(
            found,
            "Windows did not record the notification under Raycast's identity"
        );
    }
}
