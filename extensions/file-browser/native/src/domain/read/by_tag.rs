//! Spotlight search by Finder tag using `mdfind`.
//!
//! Shells out to the macOS `mdfind` command with a `kMDItemUserTags` query to
//! find files tagged with a specific Finder tag, then enriches each result with
//! filesystem metadata and Spotlight `MDItem` attributes.

use super::dto::{Item, ReadDirOptions};
use crate::core::finder_tags::normalise_tag_display_name;
use std::{error::Error, path::Path};

/// Normalize a tag name: trim whitespace, reject empty result.
pub fn normalize_tag_name(name: &str) -> Option<String> {
    normalise_tag_display_name(name)
}

fn spotlight_string_literal(value: &str) -> Result<String, Box<dyn Error>> {
    if value.contains('\n') || value.contains('\r') {
        return Err("tag name cannot contain newlines".into());
    }

    let mut escaped = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '\\' => escaped.push_str("\\\\"),
            '"' => escaped.push_str("\\\""),
            _ => escaped.push(ch),
        }
    }
    Ok(format!("\"{}\"", escaped))
}

fn item_from_path(path: &Path) -> Result<Item, Box<dyn Error>> {
    let md = std::fs::symlink_metadata(path)
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

    let md_attrs = super::mditem::fetch_mditem_attrs(path)?;

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

fn is_package_like_dir(path: &Path) -> bool {
    objc2::rc::autoreleasepool(|_| {
        use objc2::runtime::AnyObject;
        use objc2::msg_send;
        use objc2_foundation::{NSString, NSURL};

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

        is_package_by_extension(path)
    })
}

fn is_package_by_extension(path: &Path) -> bool {
    const PACKAGE_EXTENSIONS: &[&str] = &[
        "app", "bundle", "framework", "plugin", "kext", "pages", "numbers", "key", "doc", "docx",
        "rtfd", "pkg", "mpkg", "xcodeproj", "xcworkspace", "xcuserdata", "photoslibrary",
        "aplibrary", "logicx", "band",
    ];

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();

    PACKAGE_EXTENSIONS.contains(&ext.as_str())
}

fn is_mount_root_dir(path: &Path) -> bool {
    path.parent() == Some(Path::new("/Volumes"))
}

pub fn read_items_by_tag(tag: &str, options: &ReadDirOptions) -> Result<Vec<Item>, Box<dyn Error>> {
    let Some(normalized) = normalize_tag_name(tag) else {
        return Err("empty tag".into());
    };

    let query = format!("kMDItemUserTags == {}", spotlight_string_literal(&normalized)?);
    let output = std::process::Command::new("mdfind").arg(&query).output()?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let paths_str = String::from_utf8_lossy(&output.stdout);
    let mut items: Vec<Item> = Vec::new();

    for line in paths_str.lines() {
        let path = Path::new(line);
        if path.is_dir() || path.is_file() {
            if options.skip_dotfiles && is_dotfile(path) {
                continue;
            }
            if let Ok(item) = item_from_path(path) {
                items.push(item);
            }
        }
    }

    super::sort::sort_items(&mut items, options.sort_mode, options.sort_directories_first);
    Ok(items)
}

fn is_dotfile(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.starts_with('.'))
        .unwrap_or(false)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_tag_name_trims_whitespace() {
        assert_eq!(normalize_tag_name("  Blue  "), Some("Blue".to_string()));
        assert_eq!(normalize_tag_name("\tGreen\t"), Some("Green".to_string()));
    }

    #[test]
    fn normalize_tag_name_rejects_empty() {
        assert_eq!(normalize_tag_name(""), None);
        assert_eq!(normalize_tag_name("   "), None);
        assert_eq!(normalize_tag_name("\t\n"), None);
    }

    #[test]
    fn normalize_tag_name_preserves_internal() {
        assert_eq!(normalize_tag_name("Red-Blue"), Some("Red-Blue".to_string()));
        assert_eq!(normalize_tag_name("  Red-Blue  "), Some("Red-Blue".to_string()));
    }

    #[test]
    fn spotlight_string_literal_escapes_query_syntax() {
        assert_eq!(spotlight_string_literal("A\\B\"C").unwrap(), "\"A\\\\B\\\"C\"");
    }

    #[test]
    fn spotlight_string_literal_rejects_newlines() {
        let result = spotlight_string_literal("Bad\nTag");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("newlines"));
    }

    #[test]
    fn read_items_by_tag_rejects_empty_tag() {
        let result = read_items_by_tag("   ", &ReadDirOptions::default());
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("empty tag"), "error should mention 'empty tag': {err}");
    }

    #[test]
    fn read_items_by_tag_json_serialization() {
        let items: Vec<Item> = Vec::new();
        let json = serde_json::to_string(&items);
        assert!(json.is_ok(), "should serialize to JSON: {:?}", json.err());
        assert!(json.unwrap().starts_with('['), "should be JSON array");
    }
}
