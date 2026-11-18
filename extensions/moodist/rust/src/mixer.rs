use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::os::windows::process::CommandExt;
use std::{
    collections::{hash_map::DefaultHasher, BTreeMap, HashMap, VecDeque},
    fs,
    hash::{Hash, Hasher},
    io::Write,
    path::Path,
    process::{Child, Command, Stdio},
    sync::mpsc,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use windows::{
    core::{Interface, HSTRING},
    Foundation::{AsyncStatus, EventRegistrationToken, IAsyncOperation, TypedEventHandler},
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

fn spawn_worker(root: &Path) -> Result<Child, String> {
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
        .map_err(error)?;
    Ok(child)
}

pub fn request(support: &str, action: &str) -> Result<String, String> {
    request_with_launcher(support, action, spawn_worker)
}

fn request_with_launcher(
    support: &str,
    action: &str,
    mut launch: impl FnMut(&Path) -> Result<Child, String>,
) -> Result<String, String> {
    fs::create_dir_all(support).map_err(error)?;
    let root = fs::canonicalize(support).map_err(error)?;
    let mut client_lock = Some(lock(&root, "client", 30_000)?);
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
    let responses = root.join("windows-responses");
    fs::create_dir_all(&responses).map_err(error)?;
    let request_file = root.join("windows-request.json");
    let response_file = responses.join(format!("{id}.json"));
    let accepted_file = responses.join(format!("{id}.accepted"));
    atomic_write(&request_file, &envelope)?;
    let deadline = Instant::now() + Duration::from_secs(20);
    let mut launched: Option<Child> = None;
    loop {
        if client_lock.is_some() && accepted_file.exists() {
            client_lock.take();
            let _ = fs::remove_file(&accepted_file);
        }
        if let Some(event) = open_event(&root)? {
            unsafe { SetEvent(event.0) }.map_err(error)?;
        } else if launched
            .as_mut()
            .map(|child| child.try_wait())
            .transpose()
            .map_err(error)?
            .flatten()
            .is_some()
            || launched.is_none()
        {
            launched = Some(launch(&root)?);
        }
        for path in [&response_file, &root.join("windows-response.json")] {
            if let Ok(bytes) = fs::read(path) {
                if let Ok(reply) = serde_json::from_slice::<Reply>(&bytes) {
                    if reply.id == id {
                        let _ = fs::remove_file(&response_file);
                        let _ = fs::remove_file(&accepted_file);
                        if let Some(message) = reply.error {
                            return Err(message);
                        }
                        return serde_json::to_string(&reply.result.ok_or("Empty mixer response")?)
                            .map_err(error);
                    }
                }
            }
        }
        if Instant::now() > deadline {
            let _ = fs::remove_file(&accepted_file);
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
    #[serde(default)]
    playback_generation: u64,
    #[serde(default)]
    sound_generations: BTreeMap<String, u64>,
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
            playback_generation: 0,
            sound_generations: BTreeMap::new(),
            timer: None,
            preset: None,
        }
    }
}

impl Mix {
    fn sound_generation(&self, id: &str) -> u64 {
        self.sound_generations.get(id).copied().unwrap_or_default()
    }

    fn sound_was_stopped(&self, id: &str, generation: &Value) -> bool {
        generation
            .as_u64()
            .is_some_and(|value| value != self.sound_generation(id))
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
    fn prepare(file: StorageFile, sound: &Sound, master: f64) -> Result<OpeningMedia, String> {
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
        Ok(OpeningMedia {
            player,
            opened,
            opened_token,
        })
    }
}

struct OpeningMedia {
    player: Player,
    opened: mpsc::Receiver<()>,
    opened_token: EventRegistrationToken,
}

struct OpeningPlayer {
    file: Option<IAsyncOperation<StorageFile>>,
    media: Option<OpeningMedia>,
    sound: Sound,
    master: f64,
    deadline: Instant,
}
impl Drop for OpeningPlayer {
    fn drop(&mut self) {
        if let Some(file) = &self.file {
            let _ = file.Cancel();
        }
    }
}
impl OpeningPlayer {
    fn new(sound: Sound, master: f64) -> Result<Self, String> {
        Ok(Self {
            file: Some(
                StorageFile::GetFileFromPathAsync(&HSTRING::from(sound.file.as_str()))
                    .map_err(error)?,
            ),
            media: None,
            sound,
            master,
            deadline: Instant::now() + Duration::from_secs(8),
        })
    }
    fn poll(&mut self) -> Result<Option<Player>, String> {
        if Instant::now() >= self.deadline {
            return Err("Windows could not open the sound".into());
        }
        if let Some(file) = &self.file {
            if file.Status().map_err(error)? == AsyncStatus::Started {
                return Ok(None);
            }
            self.media = Some(Player::prepare(
                file.GetResults().map_err(error)?,
                &self.sound,
                self.master,
            )?);
            self.file = None;
        }
        if let Some(media) = &self.media {
            if let Ok(message) = media.player.failures.try_recv() {
                return Err(message);
            }
            if media.opened.try_recv().is_ok() {
                let media = self.media.take().ok_or("Missing prepared sound")?;
                media
                    .player
                    .media
                    .RemoveMediaOpened(media.opened_token)
                    .map_err(error)?;
                return Ok(Some(media.player));
            }
        }
        Ok(None)
    }
}

enum PlaybackChange {
    Play,
    Resume,
    Replace { preset: Option<String> },
}

struct PendingPlayback {
    id: String,
    deadline: u64,
    expires_at: Instant,
    opening: HashMap<String, OpeningPlayer>,
    players: HashMap<String, Player>,
    sounds: BTreeMap<String, Sound>,
    master: f64,
    change: PlaybackChange,
}
impl PendingPlayback {
    fn new(envelope: &Envelope, mixer: &Mixer) -> Result<Self, String> {
        let action = &envelope.action;
        let mut master = mixer.mix.master;
        let mut sounds = BTreeMap::new();
        let change = match action["type"].as_str() {
            Some("play") => {
                let id = text(action, "id")?;
                let volume = if action["volume"].is_null() {
                    mixer
                        .mix
                        .sounds
                        .get(id)
                        .map(|sound| sound.volume)
                        .unwrap_or(volume(action, "defaultVolume")?)
                } else {
                    volume(action, "volume")?
                };
                sounds.insert(
                    id.to_string(),
                    Sound {
                        volume,
                        file: text(action, "file")?.into(),
                        pid: None,
                    },
                );
                PlaybackChange::Play
            }
            Some("resume") => {
                let generations = action["soundGenerations"].as_object();
                sounds.extend(
                    mixer
                        .mix
                        .sounds
                        .iter()
                        .filter(|(id, _)| !mixer.players.contains_key(*id))
                        .filter(|(id, _)| {
                            generations.is_none_or(|generations| {
                                generations.get(*id).and_then(Value::as_u64)
                                    == Some(mixer.mix.sound_generation(id))
                            })
                        })
                        .map(|(id, sound)| (id.clone(), sound.clone())),
                );
                PlaybackChange::Resume
            }
            Some("load") => {
                if !action["master"].is_null() {
                    master = volume(action, "master")?;
                }
                let entries = action["sounds"]
                    .as_array()
                    .filter(|s| !s.is_empty())
                    .ok_or("This mix has no playable sounds")?;
                for entry in entries {
                    sounds.insert(
                        text(entry, "id")?.to_string(),
                        Sound {
                            volume: volume(entry, "volume")?,
                            file: text(entry, "file")?.into(),
                            pid: None,
                        },
                    );
                }
                PlaybackChange::Replace {
                    preset: action["preset"].as_str().map(String::from),
                }
            }
            _ => return Err("Unknown playback action".into()),
        };
        let opening = sounds
            .iter()
            .map(|(id, sound)| Ok((id.clone(), OpeningPlayer::new(sound.clone(), master)?)))
            .collect::<Result<_, String>>()?;
        Ok(Self {
            id: envelope.id.clone(),
            deadline: envelope.deadline.saturating_sub(250),
            expires_at: Instant::now()
                + Duration::from_millis(
                    envelope.deadline.saturating_sub(now()).saturating_sub(250),
                ),
            opening,
            players: HashMap::new(),
            sounds,
            master,
            change,
        })
    }
    fn poll(&mut self) -> Result<bool, String> {
        self.check_deadline()?;
        let mut ready = Vec::new();
        for (id, opening) in &mut self.opening {
            if let Some(player) = opening.poll()? {
                self.players.insert(id.clone(), player);
                ready.push(id.clone());
            }
        }
        for id in ready {
            self.opening.remove(&id);
        }
        self.check_deadline()?;
        Ok(self.opening.is_empty())
    }
    fn check_deadline(&self) -> Result<(), String> {
        if now() >= self.deadline || Instant::now() >= self.expires_at {
            Err("Mixer request expired. Try again.".into())
        } else {
            Ok(())
        }
    }
}

struct Mixer {
    mix: Mix,
    players: HashMap<String, Player>,
}
impl Mixer {
    fn commit_playback(&mut self, mut playback: PendingPlayback) -> Result<Value, String> {
        playback.check_deadline()?;
        for player in playback.players.values() {
            if let Ok(message) = player.failures.try_recv() {
                return Err(message);
            }
        }
        let replacing = matches!(playback.change, PlaybackChange::Replace { .. });
        let start = (|| {
            if replacing {
                for player in self.players.values() {
                    player.media.Pause().map_err(error)?;
                }
            }
            for player in playback.players.values() {
                playback.check_deadline()?;
                player.media.Play().map_err(error)?;
            }
            playback.check_deadline()
        })();
        if let Err(message) = start {
            drop(playback);
            if replacing {
                for player in self.players.values() {
                    let _ = player.media.Play();
                }
            }
            return Err(message);
        }

        for sound in playback.sounds.values_mut() {
            sound.pid = Some(std::process::id());
        }
        let mut count = 0;
        match playback.change {
            PlaybackChange::Replace { preset } => {
                self.players = playback.players;
                self.mix.sounds = playback.sounds;
                self.mix.master = playback.master;
                self.mix.preset = preset;
            }
            PlaybackChange::Play | PlaybackChange::Resume => {
                if matches!(playback.change, PlaybackChange::Resume) {
                    count = playback.players.len();
                }
                self.players.extend(playback.players);
                self.mix.sounds.extend(playback.sounds);
            }
        }
        Ok(json!({ "mix": self.mix, "count": count, "cancelled": false }))
    }
    fn pause(&mut self) -> usize {
        self.mix.playback_generation += 1;
        let count = self.players.len();
        self.players.clear();
        for sound in self.mix.sounds.values_mut() {
            sound.pid = None;
        }
        count
    }
    fn reconcile(&mut self, checked_at: u64) -> bool {
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
            .is_some_and(|timer| timer.ends_at <= checked_at)
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
            "stop" => {
                let id = text(action, "id")?;
                *self.mix.sound_generations.entry(id.into()).or_default() += 1;
                self.players.remove(id);
                self.mix.sounds.remove(id);
            }
            "pause" => count = self.pause(),
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

fn reply(root: &Path, id: String, result: Result<Value, String>) -> Result<(), String> {
    let (result, error) = match result {
        Ok(value) => (Some(value), None),
        Err(message) => (None, Some(message)),
    };
    let path = root.join("windows-responses").join(format!("{id}.json"));
    let reply = Reply { id, result, error };
    atomic_write(&path, &reply)?;
    // A reader can block replacement of the legacy mirror after the per-request reply is available.
    let _ = atomic_write(&root.join("windows-response.json"), &reply);
    Ok(())
}

#[derive(Default)]
struct PlaybackQueue {
    active: Option<PendingPlayback>,
    waiting: VecDeque<Envelope>,
}

fn cancel_playback(root: &Path, queue: &mut PlaybackQueue, reason: &str) -> Result<(), String> {
    if let Some(playback) = queue.active.take() {
        let id = playback.id.clone();
        drop(playback);
        reply(root, id, Err(reason.into()))?;
    }
    for envelope in queue.waiting.drain(..) {
        reply(root, envelope.id, Err(reason.into()))?;
    }
    Ok(())
}

fn cancel_sound(root: &Path, queue: &mut PlaybackQueue, id: &str) -> Result<(), String> {
    let cancelled = "Playback was cancelled by Stop";
    if let Some(active) = queue.active.as_mut() {
        if active.sounds.remove(id).is_some() {
            active.opening.remove(id);
            active.players.remove(id);
            if active.sounds.is_empty() {
                let request_id = active.id.clone();
                queue.active = None;
                reply(root, request_id, Err(cancelled.into()))?;
            }
        }
    }
    for envelope in std::mem::take(&mut queue.waiting) {
        if envelope.action["type"] == "play" && envelope.action["id"] == id {
            reply(root, envelope.id, Err(cancelled.into()))?;
        } else {
            queue.waiting.push_back(envelope);
        }
    }
    Ok(())
}

fn handle_request(
    root: &Path,
    mixer: &mut Mixer,
    queue: &mut PlaybackQueue,
    mut envelope: Envelope,
) -> Result<(), String> {
    reconcile_state(root, mixer, queue)?;
    if envelope.deadline <= now() {
        return reply(
            root,
            envelope.id,
            Err("Mixer request expired. Try again.".into()),
        );
    }
    if matches!(
        envelope.action["type"].as_str(),
        Some("play" | "resume" | "load")
    ) && envelope.action["playbackGeneration"]
        .as_u64()
        .is_some_and(|generation| generation != mixer.mix.playback_generation)
    {
        return reply(
            root,
            envelope.id,
            Err("Playback was cancelled while sounds were downloading".into()),
        );
    }
    match envelope.action["type"].as_str() {
        Some("play")
            if envelope.action["id"].as_str().is_some_and(|id| {
                mixer
                    .mix
                    .sound_was_stopped(id, &envelope.action["soundGeneration"])
            }) =>
        {
            return reply(
                root,
                envelope.id,
                Err("Playback was cancelled by Stop".into()),
            );
        }
        Some("play" | "resume" | "volume" | "master") => {
            queue.waiting.push_back(envelope);
            return Ok(());
        }
        Some("stop") => {
            let id = match text(&envelope.action, "id") {
                Ok(id) => id,
                Err(message) => return reply(root, envelope.id, Err(message)),
            };
            cancel_sound(root, queue, id)?;
        }
        Some("load") => {
            if let Some(sounds) = envelope.action["sounds"]
                .as_array_mut()
                .filter(|sounds| !sounds.is_empty())
            {
                sounds.retain(|sound| {
                    !sound["id"].as_str().is_some_and(|id| {
                        mixer.mix.sound_was_stopped(id, &sound["soundGeneration"])
                    })
                });
                if sounds.is_empty() {
                    return reply(
                        root,
                        envelope.id,
                        Err("Playback was cancelled by Stop".into()),
                    );
                }
            }
            cancel_playback(
                root,
                queue,
                "Playback preparation was cancelled by another command",
            )?;
        }
        Some("stopAll" | "pause") => {
            cancel_playback(
                root,
                queue,
                "Playback preparation was cancelled by another command",
            )?;
        }
        _ => {}
    }
    apply_request(root, mixer, queue, envelope)
}

fn apply_request(
    root: &Path,
    mixer: &mut Mixer,
    queue: &mut PlaybackQueue,
    envelope: Envelope,
) -> Result<(), String> {
    let result = if envelope.deadline <= now() {
        Err("Mixer request expired. Try again.".into())
    } else if matches!(
        envelope.action["type"].as_str(),
        Some("load" | "play" | "resume")
    ) {
        match PendingPlayback::new(&envelope, mixer) {
            Ok(playback) => {
                queue.active = Some(playback);
                return Ok(());
            }
            Err(message) => Err(message),
        }
    } else {
        mixer.apply(&envelope.action)
    };
    atomic_write(&root.join("windows-mix.json"), &mixer.mix)?;
    reply(root, envelope.id, result)
}

fn reconcile_state(
    root: &Path,
    mixer: &mut Mixer,
    queue: &mut PlaybackQueue,
) -> Result<(), String> {
    let checked_at = now();
    let timer_expired = mixer
        .mix
        .timer
        .as_ref()
        .is_some_and(|timer| timer.ends_at <= checked_at);
    if mixer.reconcile(checked_at) {
        atomic_write(&root.join("windows-mix.json"), &mixer.mix)?;
    }
    if timer_expired {
        cancel_playback(
            root,
            queue,
            "Playback preparation was cancelled by the sleep timer",
        )?;
    }
    Ok(())
}

fn tick(root: &Path, mixer: &mut Mixer, queue: &mut PlaybackQueue) -> Result<(), String> {
    reconcile_state(root, mixer, queue)?;
    if let Some(load) = queue.active.as_mut() {
        let result = match load.poll() {
            Ok(false) => return Ok(()),
            Ok(true) => {
                reconcile_state(root, mixer, queue)?;
                if queue.active.is_none() {
                    return Ok(());
                }
                let load = queue.active.take().ok_or("Missing pending playback")?;
                let id = load.id.clone();
                (id, mixer.commit_playback(load))
            }
            Err(message) => {
                let load = queue.active.take().ok_or("Missing pending playback")?;
                let id = load.id.clone();
                drop(load);
                (id, Err(message))
            }
        };
        atomic_write(&root.join("windows-mix.json"), &mixer.mix)?;
        return reply(root, result.0, result.1);
    }
    if let Some(envelope) = queue.waiting.pop_front() {
        apply_request(root, mixer, queue, envelope)?;
    }
    Ok(())
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
    mixer.reconcile(now());
    atomic_write(&state, &mixer.mix)?;
    let event = Handle(
        unsafe { CreateEventW(None, false, false, &name(&root, "request")) }.map_err(error)?,
    );
    fs::create_dir_all(root.join("windows-responses")).map_err(error)?;
    let request_file = root.join("windows-request.json");
    let mut last_request = String::new();
    let mut queue = PlaybackQueue::default();
    let mut active_at = Instant::now();
    loop {
        if let Ok(bytes) = fs::read(&request_file) {
            if let Ok(envelope) = serde_json::from_slice::<Envelope>(&bytes) {
                if envelope.id != last_request {
                    last_request = envelope.id.clone();
                    atomic_write(
                        &root
                            .join("windows-responses")
                            .join(format!("{}.accepted", envelope.id)),
                        &true,
                    )?;
                    handle_request(&root, &mut mixer, &mut queue, envelope)?;
                    active_at = Instant::now();
                }
            }
        }
        tick(&root, &mut mixer, &mut queue)?;
        if !mixer.players.is_empty()
            || mixer.mix.timer.is_some()
            || queue.active.is_some()
            || !queue.waiting.is_empty()
        {
            active_at = Instant::now();
        }
        if active_at.elapsed() > Duration::from_secs(30) {
            return Ok(());
        }
        unsafe {
            WaitForSingleObject(
                event.0,
                if queue.active.is_some() || !queue.waiting.is_empty() {
                    20
                } else {
                    100
                },
            );
        }
    }
}
