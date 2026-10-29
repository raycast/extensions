use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::os::windows::process::CommandExt;
use std::{
    collections::{hash_map::DefaultHasher, BTreeMap, HashMap},
    fs,
    hash::{Hash, Hasher},
    io::Write,
    path::Path,
    process::{Command, Stdio},
    sync::mpsc,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use windows::{
    core::{Interface, HSTRING},
    Foundation::TypedEventHandler,
    Media::{Core::MediaSource, Playback::MediaPlayer},
    Storage::{IStorageFile, StorageFile},
    Win32::{
        Foundation::{
            CloseHandle, GetHandleInformation, SetHandleInformation, ERROR_FILE_NOT_FOUND, HANDLE,
            HANDLE_FLAGS, HANDLE_FLAG_INHERIT, WAIT_ABANDONED, WAIT_OBJECT_0,
        },
        Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH},
        System::{
            Com::{CoInitializeEx, CoUninitialize, COINIT_MULTITHREADED},
            Console::{GetStdHandle, STD_ERROR_HANDLE, STD_INPUT_HANDLE, STD_OUTPUT_HANDLE},
            Threading::{
                CreateEventW, CreateMutexW, OpenEventW, ReleaseMutex, SetEvent,
                WaitForSingleObject, EVENT_MODIFY_STATE, SYNCHRONIZATION_SYNCHRONIZE,
            },
        },
    },
};

struct Handle(HANDLE);
impl Drop for Handle {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(self.0);
        }
    }
}
struct MutexGuard(Handle);
impl Drop for MutexGuard {
    fn drop(&mut self) {
        unsafe {
            let _ = ReleaseMutex(self.0 .0);
        }
    }
}
struct ComGuard;
impl Drop for ComGuard {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}

struct StdioInheritance(Vec<(HANDLE, u32)>);
impl StdioInheritance {
    fn suspend() -> Result<Self, String> {
        let mut guard = Self(Vec::new());
        for kind in [STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE] {
            if let Ok(handle) = unsafe { GetStdHandle(kind) } {
                let mut flags = 0;
                if unsafe { GetHandleInformation(handle, &mut flags) }.is_ok()
                    && flags & HANDLE_FLAG_INHERIT.0 != 0
                {
                    unsafe { SetHandleInformation(handle, HANDLE_FLAG_INHERIT.0, HANDLE_FLAGS(0)) }
                        .map_err(error)?;
                    guard.0.push((handle, flags));
                }
            }
        }
        Ok(guard)
    }
}
impl Drop for StdioInheritance {
    fn drop(&mut self) {
        for (handle, flags) in &self.0 {
            unsafe {
                let _ = SetHandleInformation(*handle, HANDLE_FLAG_INHERIT.0, HANDLE_FLAGS(*flags));
            }
        }
    }
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn name(root: &Path, kind: &str) -> HSTRING {
    let mut hash = DefaultHasher::new();
    root.hash(&mut hash);
    HSTRING::from(format!(
        "Local\\RaycastMoodistV1_{:016x}_{kind}",
        hash.finish()
    ))
}
fn lock(root: &Path, kind: &str, timeout: u32) -> Result<MutexGuard, String> {
    let handle = Handle(unsafe { CreateMutexW(None, false, &name(root, kind)) }.map_err(error)?);
    match unsafe { WaitForSingleObject(handle.0, timeout) } {
        WAIT_OBJECT_0 | WAIT_ABANDONED => Ok(MutexGuard(handle)),
        _ => Err("Moodist is busy. Try again.".into()),
    }
}
fn open_event(root: &Path) -> Result<Option<Handle>, String> {
    match unsafe {
        OpenEventW(
            EVENT_MODIFY_STATE | SYNCHRONIZATION_SYNCHRONIZE,
            false,
            &name(root, "request"),
        )
    } {
        Ok(handle) => Ok(Some(Handle(handle))),
        Err(e) if e.code() == windows::core::HRESULT::from_win32(ERROR_FILE_NOT_FOUND.0) => {
            Ok(None)
        }
        Err(e) => Err(error(e)),
    }
}
fn atomic_write(path: &Path, value: &impl Serialize) -> Result<(), String> {
    let temp = path.with_extension(format!("{}.tmp", std::process::id()));
    fs::write(&temp, serde_json::to_vec(value).map_err(error)?).map_err(error)?;
    unsafe {
        MoveFileExW(
            &HSTRING::from(temp.as_os_str()),
            &HSTRING::from(path.as_os_str()),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    }
    .map_err(error)
}

// Keep wire-format annotations on private IPC types: Raycast's type scanner
// otherwise tries to expose internal maps it cannot translate to TypeScript.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Envelope {
    id: String,
    deadline: u64,
    action: Value,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Reply {
    id: String,
    result: Option<Value>,
    error: Option<String>,
}

fn spawn_worker(root: &Path) -> Result<(), String> {
    // Rust's Windows process launcher can inherit Raycast's original pipe handles even
    // with null stdio. Keeping either write end open prevents the bridge call completing.
    let _stdio = StdioInheritance::suspend()?;
    let mut child = Command::new(std::env::current_exe().map_err(error)?)
        .arg("mixer_worker")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(0x08000000 | 0x00000200)
        .spawn()
        .map_err(error)?;
    child
        .stdin
        .take()
        .ok_or("Could not start Moodist mixer")?
        .write_all(
            serde_json::to_string(&[root.to_string_lossy()])
                .map_err(error)?
                .as_bytes(),
        )
        .map_err(error)
}

pub fn request(support: &str, action: &str) -> Result<String, String> {
    fs::create_dir_all(support).map_err(error)?;
    let root = fs::canonicalize(support).map_err(error)?;
    let _lock = lock(&root, "client", 30_000)?;
    let action: Value = serde_json::from_str(action).map_err(error)?;
    let id = format!(
        "{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    );
    let envelope = Envelope {
        id: id.clone(),
        deadline: now() + 20_000,
        action,
    };
    let request_file = root.join("windows-request.json");
    let response_file = root.join("windows-response.json");
    atomic_write(&request_file, &envelope)?;
    let deadline = Instant::now() + Duration::from_secs(20);
    let mut launched = false;
    loop {
        if let Some(event) = open_event(&root)? {
            unsafe { SetEvent(event.0) }.map_err(error)?;
        } else if !launched {
            spawn_worker(&root)?;
            launched = true;
        }
        if let Ok(bytes) = fs::read(&response_file) {
            if let Ok(reply) = serde_json::from_slice::<Reply>(&bytes) {
                if reply.id == id {
                    if let Some(message) = reply.error {
                        return Err(message);
                    }
                    return serde_json::to_string(&reply.result.ok_or("Empty mixer response")?)
                        .map_err(error);
                }
            }
        }
        if Instant::now() > deadline {
            return Err("Windows mixer did not respond. Try again.".into());
        }
        std::thread::sleep(Duration::from_millis(20));
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Sound {
    volume: f64,
    file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pid: Option<u32>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Timer {
    ends_at: u64,
    minutes: u64,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Mix {
    master: f64,
    sounds: BTreeMap<String, Sound>,
    #[serde(skip_serializing_if = "Option::is_none")]
    timer: Option<Timer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    preset: Option<String>,
}
impl Default for Mix {
    fn default() -> Self {
        Self {
            master: 1.0,
            sounds: BTreeMap::new(),
            timer: None,
            preset: None,
        }
    }
}

struct Player {
    media: MediaPlayer,
    failures: mpsc::Receiver<String>,
}
impl Drop for Player {
    fn drop(&mut self) {
        let _ = self.media.Pause();
        let _ = self.media.Close();
    }
}
impl Player {
    fn open(sound: &Sound, master: f64) -> Result<Self, String> {
        let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(sound.file.as_str()))
            .map_err(error)?
            .get()
            .map_err(error)?;
        let file: IStorageFile = file.cast().map_err(error)?;
        let source = MediaSource::CreateFromStorageFile(&file).map_err(error)?;
        let media = MediaPlayer::new().map_err(error)?;
        let (failed_tx, failures) = mpsc::channel();
        let player = Self { media, failures };
        // MediaPlayer otherwise publishes ambient tracks to Windows' media controls.
        player
            .media
            .CommandManager()
            .map_err(error)?
            .SetIsEnabled(false)
            .map_err(error)?;
        player
            .media
            .SystemMediaTransportControls()
            .map_err(error)?
            .SetIsEnabled(false)
            .map_err(error)?;
        player.media.SetAutoPlay(false).map_err(error)?;
        player.media.SetIsLoopingEnabled(true).map_err(error)?;
        player
            .media
            .SetVolume(sound.volume * master)
            .map_err(error)?;
        let (opened_tx, opened) = mpsc::channel();
        let opened_token = player
            .media
            .MediaOpened(&TypedEventHandler::new(move |_, _| {
                let _ = opened_tx.send(());
                Ok(())
            }))
            .map_err(error)?;
        player
            .media
            .MediaFailed(&TypedEventHandler::new(
                move |_, args: &Option<windows::Media::Playback::MediaPlayerFailedEventArgs>| {
                    let message = args
                        .as_ref()
                        .and_then(|a| a.ErrorMessage().ok())
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| "Windows could not decode the sound".into());
                    let _ = failed_tx.send(message);
                    Ok(())
                },
            ))
            .map_err(error)?;
        player.media.SetSource(&source).map_err(error)?;
        let deadline = Instant::now() + Duration::from_secs(8);
        loop {
            if let Ok(message) = player.failures.try_recv() {
                return Err(message);
            }
            if opened.recv_timeout(Duration::from_millis(20)).is_ok() {
                break;
            }
            if Instant::now() > deadline {
                return Err("Windows could not open the sound".into());
            }
        }
        player
            .media
            .RemoveMediaOpened(opened_token)
            .map_err(error)?;
        player.media.Play().map_err(error)?;
        Ok(player)
    }
}

struct Mixer {
    mix: Mix,
    players: HashMap<String, Player>,
}
impl Mixer {
    fn pause(&mut self) -> usize {
        let count = self.players.len();
        self.players.clear();
        for sound in self.mix.sounds.values_mut() {
            sound.pid = None;
        }
        count
    }
    fn start(&mut self, id: &str, sound: Sound) -> Result<(), String> {
        let player = Player::open(&sound, self.mix.master)?;
        self.players.insert(id.into(), player);
        self.mix.sounds.insert(
            id.into(),
            Sound {
                pid: Some(std::process::id()),
                ..sound
            },
        );
        Ok(())
    }
    fn reconcile(&mut self) -> bool {
        let failed: Vec<_> = self
            .players
            .iter()
            .filter(|(_, player)| player.failures.try_recv().is_ok())
            .map(|(id, _)| id.clone())
            .collect();
        let mut changed = !failed.is_empty();
        for id in failed {
            self.players.remove(&id);
            if let Some(sound) = self.mix.sounds.get_mut(&id) {
                sound.pid = None;
            }
        }
        if self
            .mix
            .timer
            .as_ref()
            .is_some_and(|timer| timer.ends_at <= now())
        {
            self.pause();
            self.mix.timer = None;
            changed = true;
        }
        changed
    }
    fn apply(&mut self, action: &Value) -> Result<Value, String> {
        let mut count = 0usize;
        let mut cancelled = false;
        match action["type"].as_str().ok_or("Missing mixer action")? {
            "get" => {}
            "play" => {
                let id = text(action, "id")?;
                let volume = if action["volume"].is_null() {
                    self.mix
                        .sounds
                        .get(id)
                        .map(|s| s.volume)
                        .unwrap_or(volume(action, "defaultVolume")?)
                } else {
                    volume(action, "volume")?
                };
                self.start(
                    id,
                    Sound {
                        volume,
                        file: text(action, "file")?.into(),
                        pid: None,
                    },
                )?;
            }
            "stop" => {
                let id = text(action, "id")?;
                self.players.remove(id);
                self.mix.sounds.remove(id);
            }
            "pause" => count = self.pause(),
            "resume" => {
                let sounds = self.mix.sounds.clone();
                for (id, sound) in sounds {
                    if !self.players.contains_key(&id) {
                        self.start(&id, sound)?;
                        count += 1;
                    }
                }
            }
            "stopAll" => {
                count = self.mix.sounds.len();
                self.pause();
                self.mix.sounds.clear();
                self.mix.preset = None;
            }
            "volume" => {
                let id = text(action, "id")?;
                let volume = volume(action, "volume")?;
                if let Some(sound) = self.mix.sounds.get_mut(id) {
                    if let Some(player) = self.players.get(id) {
                        player
                            .media
                            .SetVolume(volume * self.mix.master)
                            .map_err(error)?;
                    }
                    sound.volume = volume;
                }
            }
            "master" => {
                let master = volume(action, "volume")?;
                for (id, player) in &self.players {
                    player
                        .media
                        .SetVolume(self.mix.sounds[id].volume * master)
                        .map_err(error)?;
                }
                self.mix.master = master;
            }
            "load" => {
                let master = volume(action, "master")?;
                let entries = action["sounds"]
                    .as_array()
                    .filter(|s| !s.is_empty())
                    .ok_or("This mix has no playable sounds")?;
                let mut sounds = BTreeMap::new();
                let mut players = HashMap::new();
                for entry in entries {
                    let id = text(entry, "id")?;
                    let sound = Sound {
                        volume: volume(entry, "volume")?,
                        file: text(entry, "file")?.into(),
                        pid: Some(std::process::id()),
                    };
                    players.insert(id.to_string(), Player::open(&sound, master)?);
                    sounds.insert(id.to_string(), sound);
                }
                self.players = players;
                self.mix.sounds = sounds;
                self.mix.master = master;
                self.mix.preset = action["preset"].as_str().map(String::from);
            }
            "timer" => {
                let minutes = action["minutes"]
                    .as_u64()
                    .filter(|n| (1..=1440).contains(n))
                    .ok_or("Timer must be between 1 and 1440 minutes")?;
                self.mix.timer = Some(Timer {
                    ends_at: now() + minutes * 60_000,
                    minutes,
                });
            }
            "cancelTimer" => cancelled = self.mix.timer.take().is_some(),
            _ => return Err("Unknown mixer action".into()),
        }
        Ok(json!({ "mix": self.mix, "count": count, "cancelled": cancelled }))
    }
}
fn text<'a>(value: &'a Value, field: &str) -> Result<&'a str, String> {
    value[field]
        .as_str()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("Missing {field}"))
}
fn volume(value: &Value, field: &str) -> Result<f64, String> {
    value[field]
        .as_f64()
        .filter(|n| n.is_finite() && (0.05..=1.0).contains(n))
        .ok_or_else(|| format!("Invalid {field}"))
}

pub fn run(support: &str) -> Result<(), String> {
    let root = fs::canonicalize(support).map_err(error)?;
    let Ok(_owner) = lock(&root, "worker", 0) else {
        return Ok(());
    };
    unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }
        .ok()
        .map_err(error)?;
    let _com = ComGuard;
    let state = root.join("windows-mix.json");
    let mix = match fs::read(&state) {
        Ok(bytes) => serde_json::from_slice::<Mix>(&bytes).map_err(error)?,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Mix::default(),
        Err(e) => return Err(error(e)),
    };
    let mut mixer = Mixer {
        mix,
        players: HashMap::new(),
    };
    for sound in mixer.mix.sounds.values_mut() {
        sound.pid = None;
    }
    mixer.reconcile();
    atomic_write(&state, &mixer.mix)?;
    let event = Handle(
        unsafe { CreateEventW(None, false, false, &name(&root, "request")) }.map_err(error)?,
    );
    let request_file = root.join("windows-request.json");
    let response_file = root.join("windows-response.json");
    let mut last_request = String::new();
    let mut active_at = Instant::now();
    loop {
        if mixer.reconcile() {
            atomic_write(&state, &mixer.mix)?;
        }
        if let Ok(bytes) = fs::read(&request_file) {
            if let Ok(envelope) = serde_json::from_slice::<Envelope>(&bytes) {
                if envelope.id != last_request {
                    let result = if envelope.deadline < now() {
                        Err("Mixer request expired. Try again.".into())
                    } else {
                        mixer.apply(&envelope.action)
                    };
                    // Persist partial changes on errors too, so a failed multi-sound resume remains tracked.
                    atomic_write(&state, &mixer.mix)?;
                    let reply = match result {
                        Ok(value) => Reply {
                            id: envelope.id.clone(),
                            result: Some(value),
                            error: None,
                        },
                        Err(message) => Reply {
                            id: envelope.id.clone(),
                            result: None,
                            error: Some(message),
                        },
                    };
                    atomic_write(&response_file, &reply)?;
                    last_request = envelope.id;
                    active_at = Instant::now();
                }
            }
        }
        if !mixer.players.is_empty() || mixer.mix.timer.is_some() {
            active_at = Instant::now();
        }
        if active_at.elapsed() > Duration::from_secs(30) {
            return Ok(());
        }
        unsafe {
            WaitForSingleObject(event.0, 100);
        }
    }
}
