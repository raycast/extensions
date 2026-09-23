//! Title-to-URL lookup backed by the browsers' history databases.
//!
//! UI Automation exposes a tab's title but not its URL. The URL of a tab that is currently
//! being displayed can be read from the window, but background tabs have no URL anywhere in
//! the accessibility tree, so they are matched by title against the browser's history.

use crate::sqlite::Sqlite;
use std::collections::HashMap;
use std::path::PathBuf;

/// Most recent first, so the newest URL for a repeated title is the one that is kept. The
/// limit keeps the scan cheap on long histories; older entries are unlikely to match an
/// open tab.
const CHROMIUM_QUERY: &str =
    "SELECT title, url FROM urls WHERE title <> '' ORDER BY last_visit_time DESC LIMIT 20000";

const GECKO_QUERY: &str = "SELECT title, url FROM moz_places \
     WHERE title IS NOT NULL AND title <> '' ORDER BY last_visit_date DESC LIMIT 20000";

/// A browser rewrites its history constantly while it is in use, so matching on the files
/// alone would almost never hit. History is only a hint for the URL of a background tab, so
/// a recent cache is reused even when the files have moved on.
const CACHE_TTL: std::time::Duration = std::time::Duration::from_secs(30);

/// Builds a title-to-URL map from every browser profile's history database.
///
/// Copying and scanning the databases is most of the work of listing tabs, so the result is
/// cached and reused until one of the history files changes.
pub fn title_urls() -> HashMap<String, String> {
    let files = history_files();
    let cache = std::env::temp_dir().join("raycast-browser-tabs-history.json");
    let key = cache_key(&files);

    if let Some(cached) = read_cache(&cache, &key) {
        return cached;
    }

    let mut titles = HashMap::new();
    if let Some(sqlite) = Sqlite::load() {
        for (file, query) in files.iter() {
            sqlite.query(file, query, |row| {
                if let (Some(title), Some(url)) = (row.text(0), row.text(1)) {
                    titles.entry(title).or_insert(url);
                }
            });
        }
    }

    write_cache(&cache, &key, &titles);
    titles
}

/// The user data folder of every Chromium based browser.
pub fn chromium_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        let local = PathBuf::from(local);
        roots.push(local.join("Google/Chrome/User Data"));
        roots.push(local.join("Microsoft/Edge/User Data"));
        roots.push(local.join("BraveSoftware/Brave-Browser/User Data"));
        roots.push(local.join("Vivaldi/User Data"));
        roots.push(local.join("Chromium/User Data"));
    }
    if let Ok(roaming) = std::env::var("APPDATA") {
        let roaming = PathBuf::from(roaming);
        roots.push(roaming.join("Opera Software/Opera Stable"));
        roots.push(roaming.join("Opera Software/Opera GX Stable"));
    }
    roots.into_iter().filter(|root| root.is_dir()).collect()
}

/// A Chromium user data folder holds one directory per profile, and may itself be one.
pub fn profile_directories(root: &PathBuf) -> Vec<PathBuf> {
    let mut profiles = vec![root.clone()];
    if let Ok(entries) = std::fs::read_dir(root) {
        profiles.extend(entries.flatten().map(|entry| entry.path()).filter(|path| path.is_dir()));
    }
    profiles
}

/// Every Firefox or Zen Browser profile directory.
pub fn gecko_profiles() -> Vec<PathBuf> {
    let Ok(roaming) = std::env::var("APPDATA") else {
        return Vec::new();
    };
    let roaming = PathBuf::from(roaming);
    let mut profiles = Vec::new();
    for root in [roaming.join("Mozilla/Firefox/Profiles"), roaming.join("zen/Profiles")] {
        if let Ok(entries) = std::fs::read_dir(&root) {
            profiles.extend(entries.flatten().map(|entry| entry.path()).filter(|path| path.is_dir()));
        }
    }
    profiles
}

fn history_files() -> Vec<(PathBuf, &'static str)> {
    let mut files = Vec::new();
    for root in chromium_roots() {
        for profile in profile_directories(&root) {
            let file = profile.join("History");
            if file.is_file() {
                files.push((file, CHROMIUM_QUERY));
            }
        }
    }
    for profile in gecko_profiles() {
        let file = profile.join("places.sqlite");
        if file.is_file() {
            files.push((file, GECKO_QUERY));
        }
    }
    files
}

/// Identifies the state of the history files, so the cache is dropped when any of them
/// changes.
fn cache_key(files: &[(PathBuf, &'static str)]) -> String {
    let mut key = String::new();
    for (file, _) in files {
        let Ok(metadata) = file.metadata() else {
            continue;
        };
        let modified = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|since| since.as_secs())
            .unwrap_or_default();
        key.push_str(&format!("{}:{}:{};", file.display(), modified, metadata.len()));
    }
    key
}

fn read_cache(path: &std::path::Path, key: &str) -> Option<HashMap<String, String>> {
    let fresh = path
        .metadata()
        .and_then(|metadata| metadata.modified())
        .and_then(|modified| modified.elapsed().map_err(std::io::Error::other))
        .map(|age| age < CACHE_TTL)
        .unwrap_or(false);

    let contents = std::fs::read_to_string(path).ok()?;
    let (cached_key, entries) = contents.split_once('\n')?;
    (fresh || cached_key == key)
        .then(|| serde_json::from_str(entries).ok())
        .flatten()
}

fn write_cache(path: &std::path::Path, key: &str, titles: &HashMap<String, String>) {
    if let Ok(entries) = serde_json::to_string(titles) {
        let _ = std::fs::write(path, format!("{key}\n{entries}"));
    }
}
