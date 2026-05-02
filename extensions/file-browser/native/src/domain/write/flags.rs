use std::error::Error;
use std::fs;
use std::os::macos::fs::MetadataExt;
use std::path::Path;
use std::process::Command;

/// Return true if the Finder 'locked' flag (uchg) is currently set on the path.
pub fn is_locked(path: &Path) -> Result<bool, Box<dyn Error>> {
    let metadata = fs::metadata(path)?;
    let flags = metadata.st_flags();
    Ok((flags & libc::UF_IMMUTABLE as u32) != 0)
}

pub fn set_locked_flag(path: &Path, locked: bool) -> Result<(), Box<dyn Error>> {
    let flag = if locked { "uchg" } else { "nouchg" };
    let status = Command::new("chflags").arg(flag).arg(path).status()?;
    if !status.success() {
        return Err(format!("chflags failed with status: {}", status).into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering as AtomicOrdering};

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn make_test_file(name: &str) -> (std::path::PathBuf, std::path::PathBuf) {
        let id = TEST_COUNTER.fetch_add(1, AtomicOrdering::Relaxed);
        let dir = std::env::temp_dir().join(format!("ray-fb-test-flags-{name}-{id}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("testfile.txt");
        fs::File::create(&file).unwrap();
        (dir, file)
    }

    fn cleanup(dir: &Path) {
        // Ensure unlocked before cleanup to avoid permission errors
        let _ = set_locked_flag(dir.join("testfile.txt").as_path(), false);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn is_locked_returns_false_initially() {
        let (dir, file) = make_test_file("initial");
        let locked = is_locked(&file).unwrap();
        assert!(!locked, "newly created file should not be locked");
        cleanup(&dir);
    }

    #[test]
    fn set_locked_then_get_returns_true() {
        let (dir, file) = make_test_file("lock");
        set_locked_flag(&file, true).unwrap();
        let locked = is_locked(&file).unwrap();
        assert!(locked, "file should be locked after set_locked(true)");
        cleanup(&dir);
    }

    #[test]
    fn unlock_then_get_returns_false() {
        let (dir, file) = make_test_file("unlock");
        set_locked_flag(&file, true).unwrap();
        assert!(is_locked(&file).unwrap());

        set_locked_flag(&file, false).unwrap();
        let locked = is_locked(&file).unwrap();
        assert!(!locked, "file should be unlocked after set_locked(false)");
        cleanup(&dir);
    }

    #[test]
    fn is_locked_on_nonexistent_returns_error() {
        let result = is_locked(Path::new("/no/such/file/ray-fb-test-flags"));
        assert!(result.is_err(), "should error on nonexistent path");
    }

    #[test]
    fn set_locked_on_nonexistent_returns_error() {
        let result = set_locked_flag(Path::new("/no/such/file/ray-fb-test-flags"), true);
        assert!(result.is_err(), "should error on nonexistent path");
    }
}
