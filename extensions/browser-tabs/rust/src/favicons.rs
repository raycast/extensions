//! Favicons taken from the browsers' own icon databases.
//!
//! The icons a browser has already downloaded are sitting on disk, so they are read from
//! there and written out as files the extension can point at. That keeps the icons exact,
//! including per page rather than per site, and means listing tabs needs no network access.

use crate::sqlite::Sqlite;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// page URL, icon bytes, icon width
const CHROMIUM_QUERY: &str = "SELECT m.page_url, b.image_data, b.width \
     FROM icon_mapping m JOIN favicon_bitmaps b ON b.icon_id = m.icon_id \
     WHERE b.image_data IS NOT NULL";

const GECKO_QUERY: &str = "SELECT p.page_url, i.data, i.width \
     FROM moz_pages_w_icons p \
     JOIN moz_icons_to_pages ip ON ip.page_id = p.id \
     JOIN moz_icons i ON i.id = ip.icon_id \
     WHERE i.data IS NOT NULL";

/// Writes out the icon for each of `urls` and returns the file for each one it found.
///
/// Reading the icon databases costs about a second, so what has already been looked up is
/// remembered, and a page that has been seen before never goes back to the databases. An
/// address that has never been seen falls back to whatever is known about the site, since
/// the address of a page in use picks up parameters the stored mapping does not have. Pages
/// with no icon are remembered as such, otherwise they would be searched for every time.
pub fn icon_files(urls: &[String]) -> HashMap<String, String> {
    let mut known = read_cache();
    // an icon written earlier may have been cleared out of the temporary directory since
    known.retain(|_, file| file.is_empty() || Path::new(file).exists());

    let missing: Vec<String> = urls
        .iter()
        .filter(|url| remembered(&known, url).is_none())
        .cloned()
        .collect();
    if !missing.is_empty() {
        for (url, file) in look_up(&missing) {
            if let Some(host) = host_of(&url) {
                known.insert(site_key(&host), file.clone());
            }
            known.insert(url, file);
        }
        // pages the browsers have no icon for are recorded as such
        for url in missing {
            known.entry(url).or_default();
        }
        write_cache(&known);
    }

    urls.iter()
        .filter_map(|url| {
            remembered(&known, url)
                .filter(|file| !file.is_empty())
                .map(|file| (url.clone(), file))
        })
        .collect()
}

/// A page's address changes as it is used, while its icon belongs to the site, so what is
/// known about the site answers for addresses that have never been seen before.
fn remembered(known: &HashMap<String, String>, url: &str) -> Option<String> {
    if let Some(file) = known.get(url) {
        return Some(file.clone());
    }
    let host = host_of(url)?;
    known.get(&site_key(&host)).cloned()
}

fn site_key(host: &str) -> String {
    format!("site:{host}")
}

fn look_up(urls: &[String]) -> HashMap<String, String> {
    let mut files = HashMap::new();
    if urls.is_empty() {
        return files;
    }
    let Some(sqlite) = Sqlite::load() else {
        return files;
    };

    let mut by_page: HashMap<String, (Vec<u8>, i32)> = HashMap::new();
    for (database, query) in databases() {
        sqlite.query(&database, query, |row| {
            let (Some(page), Some(data)) = (row.text(0), row.blob(1)) else {
                return;
            };
            if !urls.contains(&page) {
                return;
            }
            // a site can store several sizes, and the largest looks best when scaled down
            keep_largest(&mut by_page, page, &data, row.int(2));
        });
    }

    let directory = cache_directory();
    for (url, (data, _)) in by_page {
        if let Some(file) = write_icon(&directory, &data) {
            files.insert(url, file);
        }
    }
    files
}

fn cache_file() -> PathBuf {
    std::env::temp_dir().join("raycast-browser-tabs-icons.json")
}

fn read_cache() -> HashMap<String, String> {
    std::fs::read_to_string(cache_file())
        .ok()
        .and_then(|contents| serde_json::from_str(&contents).ok())
        .unwrap_or_default()
}

fn write_cache(icons: &HashMap<String, String>) {
    if let Ok(contents) = serde_json::to_string(icons) {
        let _ = std::fs::write(cache_file(), contents);
    }
}

fn keep_largest(icons: &mut HashMap<String, (Vec<u8>, i32)>, key: String, data: &[u8], width: i32) {
    match icons.get(&key) {
        Some((_, kept)) if *kept >= width => {}
        _ => {
            icons.insert(key, (data.to_vec(), width));
        }
    }
}

/// Icons are named after their contents, so an icon is only written once and stays valid
/// until the site changes it.
fn write_icon(directory: &Path, data: &[u8]) -> Option<String> {
    let hash = data.iter().fold(0u64, |hash, byte| {
        hash.wrapping_mul(1_000_003).wrapping_add(*byte as u64)
    });
    let file = directory.join(format!("{hash:x}.{}", extension(data)));
    if !file.exists() {
        std::fs::write(&file, data).ok()?;
    }
    Some(file.to_string_lossy().into_owned())
}

fn extension(data: &[u8]) -> &'static str {
    match data {
        [0x89, b'P', b'N', b'G', ..] => "png",
        [0xFF, 0xD8, 0xFF, ..] => "jpg",
        [b'G', b'I', b'F', ..] => "gif",
        [0x00, 0x00, 0x01, 0x00, ..] => "ico",
        _ if data.starts_with(b"<svg") || data.starts_with(b"<?xml") => "svg",
        _ => "png",
    }
}

fn cache_directory() -> PathBuf {
    let directory = std::env::temp_dir().join("raycast-browser-tabs-icons");
    let _ = std::fs::create_dir_all(&directory);
    directory
}

fn host_of(url: &str) -> Option<String> {
    let rest = url.split_once("://")?.1;
    let host = rest.split('/').next()?;
    (!host.is_empty()).then(|| host.to_ascii_lowercase())
}

/// Every icon database belonging to a browser profile, with the query that fits its shape.
fn databases() -> Vec<(PathBuf, &'static str)> {
    let mut databases = Vec::new();
    for root in crate::history::chromium_roots() {
        for profile in crate::history::profile_directories(&root) {
            let file = profile.join("Favicons");
            if file.is_file() {
                databases.push((file, CHROMIUM_QUERY));
            }
        }
    }
    for profile in crate::history::gecko_profiles() {
        let file = profile.join("favicons.sqlite");
        if file.is_file() {
            databases.push((file, GECKO_QUERY));
        }
    }
    databases
}
