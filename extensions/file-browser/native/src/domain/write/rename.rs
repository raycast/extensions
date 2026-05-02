use std::error::Error;
use std::ffi::OsStr;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Normalize and validate a filename (not a full path).
pub fn normalize_new_name(raw: &str) -> Result<String, Box<dyn Error>> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Name is required".into());
    }
    if trimmed == "." || trimmed == ".." {
        return Err("Name cannot be '.' or '..'.".into());
    }
    if trimmed.contains(':') {
        return Err("Name cannot contain ':'.".into());
    }
    if trimmed.contains('/') {
        return Err("Name cannot contain '/'.".into());
    }
    Ok(trimmed.to_string())
}

/// Build the destination path for a rename.
pub fn new_path_for(old_path: &Path, new_name: &str) -> Result<PathBuf, Box<dyn Error>> {
    let dir = old_path.parent().ok_or("Invalid path")?;
    Ok(dir.join(new_name))
}

/// Detect if rename only differs by case on a case-insensitive filesystem.
pub fn is_case_only_rename(old_path: &Path, new_path: &Path) -> bool {
    old_path != new_path
        && old_path.to_string_lossy().to_lowercase() == new_path.to_string_lossy().to_lowercase()
}

/// Perform a two-step rename to support case-only renames safely.
pub fn rename_via_temp(dir: &Path, old_path: &Path, new_path: &Path) -> Result<(), io::Error> {
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let tmp = dir.join(format!(".tmp-rename-{}-{}", millis, std::process::id()));
    fs::rename(old_path, &tmp)?;
    match fs::rename(&tmp, new_path) {
        Ok(()) => Ok(()),
        Err(err) => {
            // best-effort rollback
            let _ = fs::rename(&tmp, old_path);
            Err(err)
        }
    }
}

/// Rename a file or directory with macOS-friendly semantics.
/// - Validates name
/// - Prevents overwriting existing targets (except case-only rename workaround)
/// - Supports case-only renames on case-insensitive filesystems by using a temp hop
pub fn rename_item(old_path: &Path, new_name: &OsStr) -> Result<PathBuf, Box<dyn Error>> {
    let new_name_str = new_name.to_string_lossy().to_string();
    let normalized_name = normalize_new_name(&new_name_str)?;

    let dir = old_path.parent().ok_or("Invalid path")?;
    let new_path = new_path_for(old_path, &normalized_name)?;

    if new_path == old_path {
        return Ok(new_path);
    }

    let is_case_only = is_case_only_rename(old_path, &new_path);

    if !is_case_only {
        match fs::metadata(&new_path) {
            Ok(_) => {
                return Err(format!(
                    "A file or folder named \"{}\" already exists in this location.",
                    normalized_name
                )
                .into())
            }
            Err(e) if e.kind() == io::ErrorKind::NotFound => {}
            Err(e) => {
                return Err(format!("Failed to check existing items: {}", e).into());
            }
        }
    }

    let format_rename_error = |error: io::Error| -> Box<dyn Error> {
        if error.kind() == io::ErrorKind::AlreadyExists {
            format!(
                "A file or folder named \"{}\" already exists in this location.",
                normalized_name
            )
            .into()
        } else {
            format!("Failed to rename item: {}", error).into()
        }
    };

    if is_case_only {
        rename_via_temp(dir, old_path, &new_path).map_err(|error| format_rename_error(error))?;
    } else {
        fs::rename(old_path, &new_path).map_err(|error| format_rename_error(error))?;
    }

    Ok(new_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalized_name_rejects_slash() {
        let err = normalize_new_name("foo/bar").unwrap_err();
        assert_eq!("Name cannot contain '/'.", err.to_string());
    }

    #[test]
    fn normalized_name_rejects_empty_string() {
        let err = normalize_new_name("").unwrap_err();
        assert_eq!("Name is required", err.to_string());
    }

    #[test]
    fn normalized_name_rejects_whitespace_only() {
        let err = normalize_new_name("   ").unwrap_err();
        assert_eq!("Name is required", err.to_string());
    }

    #[test]
    fn normalized_name_rejects_dot() {
        let err = normalize_new_name(".").unwrap_err();
        assert!(err.to_string().contains("'.'"), "expected dot rejection: {err}");
    }

    #[test]
    fn normalized_name_rejects_double_dot() {
        let err = normalize_new_name("..").unwrap_err();
        assert!(err.to_string().contains("'..'"), "expected double-dot rejection: {err}");
    }

    #[test]
    fn normalized_name_rejects_colon() {
        let err = normalize_new_name("file:name").unwrap_err();
        assert_eq!("Name cannot contain ':'.", err.to_string());
    }

    #[test]
    fn normalized_name_accepts_valid_name() {
        assert_eq!(normalize_new_name("hello.txt").unwrap(), "hello.txt");
    }

    #[test]
    fn normalized_name_accepts_name_with_spaces() {
        assert_eq!(normalize_new_name("my file.txt").unwrap(), "my file.txt");
    }

    #[test]
    fn normalized_name_trims_whitespace() {
        assert_eq!(normalize_new_name("  hello.txt  ").unwrap(), "hello.txt");
    }

    #[test]
    fn normalized_name_accepts_unicode() {
        assert_eq!(normalize_new_name("日本語.txt").unwrap(), "日本語.txt");
    }

    #[test]
    fn new_path_for_builds_correct_destination() {
        let old = Path::new("/Users/test/Documents/file.txt");
        let new = new_path_for(old, "renamed.txt").unwrap();
        assert_eq!(new, PathBuf::from("/Users/test/Documents/renamed.txt"));
    }

    #[test]
    fn is_case_only_rename_detects_case_change() {
        let old = Path::new("/tmp/file.txt");
        let new = Path::new("/tmp/File.txt");
        assert!(is_case_only_rename(old, new));
    }

    #[test]
    fn is_case_only_rename_false_for_different_names() {
        let old = Path::new("/tmp/file.txt");
        let new = Path::new("/tmp/other.txt");
        assert!(!is_case_only_rename(old, new));
    }

    #[test]
    fn is_case_only_rename_false_for_same_path() {
        let old = Path::new("/tmp/file.txt");
        assert!(!is_case_only_rename(old, old));
    }

    #[test]
    fn rename_item_rejects_empty_name() {
        let dir = std::env::temp_dir().join("ray-fb-test-rename-empty");
        std::fs::create_dir_all(&dir).ok();
        let file = dir.join("test.txt");
        std::fs::File::create(&file).ok();

        let result = rename_item(&file, std::ffi::OsStr::new(""));
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Name is required"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn rename_item_rejects_dot_name() {
        let dir = std::env::temp_dir().join("ray-fb-test-rename-dot");
        std::fs::create_dir_all(&dir).ok();
        let file = dir.join("test.txt");
        std::fs::File::create(&file).ok();

        let result = rename_item(&file, std::ffi::OsStr::new("."));
        assert!(result.is_err());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn rename_item_rejects_colon_name() {
        let dir = std::env::temp_dir().join("ray-fb-test-rename-colon");
        std::fs::create_dir_all(&dir).ok();
        let file = dir.join("test.txt");
        std::fs::File::create(&file).ok();

        let result = rename_item(&file, std::ffi::OsStr::new("bad:name"));
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("':'"));

        let _ = std::fs::remove_dir_all(&dir);
    }
}
