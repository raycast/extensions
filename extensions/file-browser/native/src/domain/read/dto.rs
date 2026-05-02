//! Item DTO, `MdItemAttrs`, `ReadDirOptions`, and the `read_dir_items` orchestrator.
//!
//! This module defines the data structures that make up the read domain's
//! public output and wires together scan → query → sort into `read_dir_items`.

use crate::core::contract::SortMode;
use crate::core::types::MdItemUserTag;
use objc2::runtime::AnyObject;
use objc2::msg_send;
use objc2_foundation::{NSString, NSURL};
use serde::Serialize;
use std::{
    error::Error,
    fs,
    path::{Path, PathBuf},
};

/// Spotlight metadata attributes for a file system entry.
///
/// Serialized with `camelCase` keys to match the TypeScript contract.
#[derive(Default, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MdItemAttrs {
    pub user_tags: Vec<MdItemUserTag>,
    pub attribute_change_date: Option<u64>,
    pub content_creation_date: Option<u64>,
    pub content_modification_date: Option<u64>,
    pub content_type: Option<String>,
    pub finder_comment: Option<String>,
    pub kind: Option<String>,
    pub last_used_date: Option<u64>,
    pub fs_content_change_date: Option<u64>,
    pub fs_creation_date: Option<u64>,
    pub fs_invisible: Option<bool>,
    /// The date the item was added to its current location (Finder "Date Added")
    pub added_date: Option<u64>,
}

/// A file system entry with metadata, serialized as the `MdItem` JSON shape.
#[derive(Debug, PartialEq, Serialize)]
pub struct Item {
    #[serde(rename = "type")]
    pub typ: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    #[serde(rename = "isPackageLike")]
    pub is_package_like: bool,
    #[serde(rename = "isMountRoot")]
    pub is_mount_root: bool,
    #[serde(flatten)]
    pub md_attrs: MdItemAttrs,
}

/// Options for `read_dir_items`.
pub struct ReadDirOptions {
    pub skip_dotfiles: bool,
    pub sort_directories_first: bool,
    pub sort_mode: SortMode,
}

impl Default for ReadDirOptions {
    fn default() -> Self {
        Self {
            skip_dotfiles: true,
            sort_directories_first: true,
            sort_mode: SortMode::default(),
        }
    }
}

/// Read, stat, query metadata, and sort all items in `dir`.
///
/// This is the main entry point for the read domain. It:
/// 1. Scans the directory (filtering dotfiles if requested)
/// 2. Stats each entry and fetches Spotlight metadata
/// 3. Sorts the result using the canonical `SortMode`
pub fn read_dir_items(dir: &Path, options: &ReadDirOptions) -> Result<Vec<Item>, Box<dyn Error>> {
    let entries = super::scan::scan_directory(dir, options.skip_dotfiles)?;

    let mut items: Vec<Item> = entries
        .into_iter()
        .filter_map(|p| stat_and_query(&p).ok())
        .collect();

    super::sort::sort_items(&mut items, options.sort_mode, options.sort_directories_first);

    Ok(items)
}

/// Hydrate a list of paths into canonical `Item` objects.
///
/// - Deduplicates paths preserving first-seen order.
/// - Silently drops paths that do not exist on disk.
/// - When `skip_dotfiles` is true, items whose name starts with `.` are excluded.
/// - Preserves the input (post-dedup) order — no sorting is applied.
pub fn hydrate_items(paths: &[PathBuf], skip_dotfiles: bool) -> Vec<Item> {
    let mut seen = std::collections::HashSet::new();
    let mut items = Vec::with_capacity(paths.len());

    for path in paths {
        if !seen.insert(path.clone()) {
            continue;
        }

        let name = path
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();

        if skip_dotfiles && name.starts_with('.') {
            continue;
        }

        if let Ok(item) = stat_and_query(path) {
            items.push(item);
        }
    }

    items
}

pub(crate) fn stat_and_query(path: &PathBuf) -> Result<Item, Box<dyn Error>> {
    let md = fs::symlink_metadata(path)
        .map_err(|e| format!("symlink_metadata failed: {}: {e}", path.display()))?;

    let is_dir = md.file_type().is_dir();

    let typ = {
        let ft = md.file_type();
        if ft.is_dir() {
            "directory"
        } else if ft.is_symlink() {
            "symlink"
        } else if ft.is_file() {
            "file"
        } else {
            "other"
        }
        .to_string()
    };

    let name = path
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned());

    let md_attrs = super::query::fetch_attrs(path)?;

    let is_package_like = is_dir && is_package_like_dir(path);
    let is_mount_root = is_dir && is_mount_root_dir(path);

    Ok(Item {
        name,
        typ,
        path: path.to_string_lossy().into_owned(),
        size: md.len(),
        is_package_like,
        is_mount_root,
        md_attrs,
    })
}

// ---------------------------------------------------------------------------
// Entry-traits: package and mount-root classification
// ---------------------------------------------------------------------------

/// Known macOS package extensions used as a fallback when the URL resource
/// API is unavailable.
const PACKAGE_EXTENSIONS: &[&str] = &[
    "app",
    "bundle",
    "framework",
    "plugin",
    "kext",
    "pages",
    "numbers",
    "key",
    "doc",
    "docx",
    "rtfd",
    "pkg",
    "mpkg",
    "xcodeproj",
    "xcworkspace",
    "xcuserdata",
    "photoslibrary",
    "aplibrary",
    "logicx",
    "band",
];

/// Determine whether a directory is a macOS package.
///
/// Uses `NSURL getResourceValue:forKey:error:` with `NSURLIsPackageKey`
/// as the authoritative source, falling back to extension-based heuristics.
fn is_package_like_dir(path: &Path) -> bool {
    objc2::rc::autoreleasepool(|_| {
        let path_str = NSString::from_str(&path.to_string_lossy());
        let url = NSURL::fileURLWithPath(&path_str);

        let key = NSString::from_str("NSURLIsPackageKey");

        unsafe {
            let mut value: *mut AnyObject = std::ptr::null_mut();
            let mut error: *mut AnyObject = std::ptr::null_mut();

            let success: bool =
                msg_send![&url, getResourceValue: &mut value, forKey: &*key, error: &mut error];

            if success && !value.is_null() {
                let is_package: bool = msg_send![value, boolValue];
                return is_package;
            }
        }

        // Fallback: extension-based heuristic
        is_package_by_extension(path)
    })
}

/// Extension-based package detection fallback.
fn is_package_by_extension(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();

    PACKAGE_EXTENSIONS.contains(&ext.as_str())
}

/// Determine whether a directory is the root of a mounted volume.
///
/// On macOS, mounted volumes appear as direct children of `/Volumes/`.
fn is_mount_root_dir(path: &Path) -> bool {
    path.parent() == Some(Path::new("/Volumes"))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn is_mount_root_detects_volumes_child() {
        assert!(is_mount_root_dir(Path::new("/Volumes/Macintosh HD")));
        assert!(is_mount_root_dir(Path::new("/Volumes/ExternalDrive")));
    }

    #[test]
    fn is_mount_root_rejects_non_volumes() {
        assert!(!is_mount_root_dir(Path::new("/Users")));
        assert!(!is_mount_root_dir(Path::new("/Applications")));
        assert!(!is_mount_root_dir(Path::new("/Volumes/ExternalDrive/Sub")));
    }

    #[test]
    fn is_package_by_extension_known_types() {
        assert!(is_package_by_extension(Path::new("/Apps/Safari.app")));
        assert!(is_package_by_extension(Path::new("/Docs/Report.pages")));
        assert!(is_package_by_extension(Path::new("/Docs/Budget.numbers")));
        assert!(is_package_by_extension(Path::new("/Docs/Slides.key")));
        assert!(is_package_by_extension(Path::new("/Foo.kext")));
        assert!(is_package_by_extension(Path::new("/Foo.framework")));
        assert!(is_package_by_extension(Path::new("/Foo.plugin")));
        assert!(is_package_by_extension(Path::new("/Foo.bundle")));
        assert!(is_package_by_extension(Path::new("/Foo.pkg")));
        assert!(is_package_by_extension(Path::new("/Foo.mpkg")));
        assert!(is_package_by_extension(Path::new("/Foo.xcodeproj")));
        assert!(is_package_by_extension(Path::new("/Foo.xcworkspace")));
        assert!(is_package_by_extension(Path::new("/Photos.photoslibrary")));
    }

    #[test]
    fn is_package_by_extension_rejects_unknown() {
        assert!(!is_package_by_extension(Path::new("/Foo.txt")));
        assert!(!is_package_by_extension(Path::new("/Foo")));
        assert!(!is_package_by_extension(Path::new("/Foo.zip")));
        assert!(!is_package_by_extension(Path::new("/Foo.dmg")));
    }

    #[test]
    fn is_package_by_extension_case_insensitive() {
        assert!(is_package_by_extension(Path::new("/Foo.APP")));
        assert!(is_package_by_extension(Path::new("/Foo.Pages")));
    }

    #[test]
    fn is_package_like_dir_detects_app_bundle() {
        let tmp = std::env::temp_dir().join("ray-fb-test-pkg-app");
        let _ = fs::remove_dir_all(&tmp);
        // Create a real .app directory — macOS NSURL and extension check both
        // recognise this as a package.
        let app_dir = tmp.join("FakeApp.app");
        fs::create_dir_all(app_dir.join("Contents")).unwrap();

        let result = is_package_like_dir(&app_dir);
        assert!(result, ".app directory should be detected as package-like");

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn is_package_like_dir_rejects_plain_directory() {
        let tmp = std::env::temp_dir().join("ray-fb-test-pkg-plain");
        let _ = fs::remove_dir_all(&tmp);
        let plain_dir = tmp.join("just-a-folder");
        fs::create_dir_all(&plain_dir).unwrap();

        let result = is_package_like_dir(&plain_dir);
        assert!(!result, "plain directory should not be detected as package-like");

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn read_dir_items_includes_traits() {
        let tmp = std::env::temp_dir().join("ray-fb-test-traits");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();
        fs::File::create(tmp.join("hello.txt")).unwrap();

        let items = read_dir_items(&tmp, &ReadDirOptions::default()).unwrap();
        assert!(!items.is_empty(), "should have at least one item");

        for item in &items {
            // Files should never be flagged as package-like or mount-root
            if item.typ == "file" {
                assert!(!item.is_package_like);
                assert!(!item.is_mount_root);
            }
        }

        let _ = fs::remove_dir_all(&tmp);
    }
}
