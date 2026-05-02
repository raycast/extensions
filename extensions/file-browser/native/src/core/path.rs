//! Path validation helpers for `ray-fb`.
//!
//! Centralises path-related checks that are used across multiple modules.

use std::path::Path;

/// Return `true` if the final component of `path` starts with a dot (`.`).
///
/// A leading dot indicates a hidden file on macOS / Unix.
/// Returns `false` for paths with no file-name component (e.g. `/`).
pub fn is_dotfile(path: &Path) -> bool {
    path.file_name()
        .map(|name| name.to_string_lossy().starts_with('.'))
        .unwrap_or(false)
}

/// Validate that `path` exists on disk.
///
/// Returns `Ok(path)` if it exists, or a description of the failure.
pub fn require_existing(path: &Path) -> Result<&Path, String> {
    if path.exists() {
        Ok(path)
    } else {
        Err(format!("path does not exist: {}", path.display()))
    }
}

/// Validate that `path` is a directory.
///
/// Returns `Ok(path)` if it is a directory, or a description of the failure.
pub fn require_directory(path: &Path) -> Result<&Path, String> {
    if path.is_dir() {
        Ok(path)
    } else {
        Err(format!("not a directory: {}", path.display()))
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn dotfile_detected() {
        assert!(is_dotfile(&PathBuf::from("/Users/test/.hidden")));
        assert!(is_dotfile(&PathBuf::from(".gitignore")));
        assert!(is_dotfile(&PathBuf::from(".DS_Store")));
    }

    #[test]
    fn non_dotfile_detected() {
        assert!(!is_dotfile(&PathBuf::from("/Users/test/file.txt")));
        assert!(!is_dotfile(&PathBuf::from("normal.txt")));
        assert!(!is_dotfile(&PathBuf::from("readme.md")));
    }

    #[test]
    fn dotfile_root_path() {
        // Root has no file_name component
        assert!(!is_dotfile(&PathBuf::from("/")));
    }
}
