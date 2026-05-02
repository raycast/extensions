//! Directory scanning with hidden-file filtering.
//!
//! Reads directory entries and optionally filters out dotfiles using the
//! canonical `core::path::is_dotfile` helper.

use crate::core::path::is_dotfile;
use std::{
    error::Error,
    fs,
    path::{Path, PathBuf},
};

/// Scan a directory and return its entries.
///
/// When `skip_dotfiles` is `true`, entries whose final path component starts
/// with a dot (`.`) are excluded.
pub fn scan_directory(dir: &Path, skip_dotfiles: bool) -> Result<Vec<PathBuf>, Box<dyn Error>> {
    let entries: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| format!("read_dir failed: {}: {e}", dir.display()))?
        .filter_map(|e| e.ok().map(|x| x.path()))
        .filter(|path| !(skip_dotfiles && is_dotfile(path)))
        .collect();
    Ok(entries)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering as AtomicOrdering};

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn make_test_dir(name: &str) -> PathBuf {
        let id = TEST_COUNTER.fetch_add(1, AtomicOrdering::Relaxed);
        let dir = std::env::temp_dir().join(format!("ray-fb-test-scan-{name}-{id}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn cleanup(dir: &Path) {
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn scan_directory_reads_entries() {
        let dir = make_test_dir("reads");
        fs::File::create(dir.join("a.txt")).unwrap();
        fs::File::create(dir.join("b.txt")).unwrap();

        let entries = scan_directory(&dir, false).unwrap();
        assert_eq!(entries.len(), 2);
        cleanup(&dir);
    }

    #[test]
    fn scan_directory_skips_dotfiles() {
        let dir = make_test_dir("skip");
        fs::File::create(dir.join("visible.txt")).unwrap();
        fs::File::create(dir.join(".hidden")).unwrap();

        let entries = scan_directory(&dir, true).unwrap();
        assert_eq!(entries.len(), 1);
        assert!(entries[0].file_name().unwrap() == "visible.txt");
        cleanup(&dir);
    }

    #[test]
    fn scan_directory_includes_dotfiles_when_not_skipping() {
        let dir = make_test_dir("include");
        fs::File::create(dir.join("visible.txt")).unwrap();
        fs::File::create(dir.join(".hidden")).unwrap();

        let entries = scan_directory(&dir, false).unwrap();
        assert_eq!(entries.len(), 2);
        cleanup(&dir);
    }

    #[test]
    fn scan_directory_nonexistent_returns_error() {
        let result = scan_directory(Path::new("/no/such/directory"), false);
        assert!(result.is_err());
    }
}
