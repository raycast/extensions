use std::error::Error;
use std::ffi::{c_char, c_int, c_void, CString};
use std::fs;
use std::os::unix::ffi::OsStrExt;
use std::os::unix::fs::symlink;
use std::path::{Path, PathBuf};

// ── Apple copyfile(3) FFI ──────────────────────────────────────

extern "C" {
    /// Apple `copyfile(3)` — copies file data and metadata.
    /// Returns 0 on success, -1 on error (sets errno).
    fn copyfile(
        from: *const c_char,
        to: *const c_char,
        state: *mut c_void,
        flags: u32,
    ) -> c_int;
}

/// `COPYFILE_DATA | COPYFILE_STAT | COPYFILE_XATTR | COPYFILE_ACL` = `0x0D`
///
/// Preserves file data, stat info (mode, timestamps), extended attributes,
/// and ACLs in a single call.
const COPYFILE_ALL: u32 = (1 << 0) | (1 << 2) | (1 << 3);

// ── Public API ─────────────────────────────────────────────────

/// Copy a file or directory to a destination directory.
///
/// - **Symlinks** are copied as symlinks (nofollow semantics).
/// - **Regular files** are copied with best-effort metadata via Apple's
///   `copyfile(3)` (xattrs, ACLs, stat info). Falls back to `fs::copy` if
///   `copyfile` fails.
/// - **Directories** are created and recursed into.
/// - On partial failure the destination subtree is removed.
/// - Existing destinations are never overwritten.
pub fn copy_item(src: &Path, dst_dir: &Path) -> Result<PathBuf, Box<dyn Error>> {
    // Use symlink_metadata so dangling symlinks are still "found"
    let src_meta = fs::symlink_metadata(src)
        .map_err(|_| format!("not found: {}", src.display()))?;

    if !dst_dir.exists() {
        return Err(format!("directory not found: {}", dst_dir.display()).into());
    }
    if !dst_dir.is_dir() {
        return Err(format!("not a directory: {}", dst_dir.display()).into());
    }

    let name = src.file_name().ok_or("Invalid source path")?;
    let dst = dst_dir.join(name);

    // Check with symlink_metadata so broken symlinks are also detected
    if dst.symlink_metadata().is_ok() {
        return Err(format!(
            "A file or folder named \"{}\" already exists in this location.",
            name.to_string_lossy()
        )
        .into());
    }

    let result = copy_entry(src, &dst, &src_meta.file_type());

    if result.is_err() {
        // Best-effort cleanup of partially created destination subtree.
        // `remove_dir_all` handles directories; `remove_file` handles
        // files and symlinks. Both are tried so the correct one fires.
        let _ = fs::remove_dir_all(&dst);
        let _ = fs::remove_file(&dst);
    }

    result.map(|_| dst)
}

// ── Internal helpers ───────────────────────────────────────────

fn copy_entry(src: &Path, dst: &Path, ft: &fs::FileType) -> Result<(), Box<dyn Error>> {
    if ft.is_symlink() {
        let target = fs::read_link(src)?;
        symlink(&target, dst)?;
    } else if ft.is_dir() {
        copy_dir_recursive(src, dst)?;
    } else {
        copy_file_with_metadata(src, dst)?;
    }
    Ok(())
}

/// Recursively copy a directory, preserving symlink semantics for children.
///
/// Uses `DirEntry::file_type()` which does **not** follow symlinks, so
/// symlinks inside directories are detected and copied as symlinks.
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), Box<dyn Error>> {
    fs::create_dir(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ft = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        copy_entry(&src_path, &dst_path, &ft)?;
    }

    Ok(())
}

/// Copy a regular file using Apple's `copyfile(3)` for metadata preservation.
///
/// `copyfile` with `COPYFILE_ALL` copies data + stat + xattrs + ACLs.
/// Falls back to `std::fs::copy` if `copyfile` fails (best-effort metadata).
fn copy_file_with_metadata(src: &Path, dst: &Path) -> Result<(), Box<dyn Error>> {
    let src_c = CString::new(src.as_os_str().as_bytes())?;
    let dst_c = CString::new(dst.as_os_str().as_bytes())?;

    let ret = unsafe {
        copyfile(
            src_c.as_ptr(),
            dst_c.as_ptr(),
            std::ptr::null_mut(),
            COPYFILE_ALL,
        )
    };

    if ret == 0 {
        return Ok(());
    }

    fs::copy(src, dst)?;
    Ok(())
}

// ── Unit tests ─────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copy_file_to_directory() {
        let dir = std::env::temp_dir().join("ray-fb-test-copy-unit-file");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();
        let src = dir.join("source.txt");
        std::fs::write(&src, "hello").ok();
        let dst_dir = dir.join("destination");
        std::fs::create_dir_all(&dst_dir).ok();

        let result = copy_item(&src, &dst_dir);
        assert!(result.is_ok(), "copy should succeed: {:?}", result);
        let copied = result.unwrap();
        assert_eq!(copied, dst_dir.join("source.txt"));
        assert!(dst_dir.join("source.txt").exists());
        assert!(src.exists(), "source should still exist after copy");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn copy_directory_recursively() {
        let dir = std::env::temp_dir().join("ray-fb-test-copy-unit-dir");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();
        let src_dir = dir.join("src_dir");
        std::fs::create_dir_all(&src_dir.join("sub")).ok();
        std::fs::write(src_dir.join("a.txt"), "aaa").ok();
        std::fs::write(src_dir.join("sub").join("b.txt"), "bbb").ok();
        let dst_dir = dir.join("destination");
        std::fs::create_dir_all(&dst_dir).ok();

        let result = copy_item(&src_dir, &dst_dir);
        assert!(result.is_ok(), "copy dir should succeed: {:?}", result);
        assert!(dst_dir.join("src_dir").is_dir());
        assert!(dst_dir.join("src_dir/a.txt").exists());
        assert!(dst_dir.join("src_dir/sub/b.txt").exists());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn copy_nonexistent_source_fails() {
        let result = copy_item(Path::new("/no/such/file/ray-fb-test"), Path::new("/tmp"));
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[test]
    fn copy_to_nonexistent_dir_fails() {
        let dir = std::env::temp_dir().join("ray-fb-test-copy-unit-nodest");
        std::fs::create_dir_all(&dir).ok();
        let src = dir.join("source.txt");
        std::fs::write(&src, "hello").ok();

        let result = copy_item(&src, Path::new("/no/such/dir/ray-fb-test"));
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn copy_existing_name_fails() {
        let dir = std::env::temp_dir().join("ray-fb-test-copy-unit-exists");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();
        let src = dir.join("source.txt");
        std::fs::write(&src, "hello").ok();
        let dst_dir = dir.join("dest");
        std::fs::create_dir_all(&dst_dir).ok();
        std::fs::write(dst_dir.join("source.txt"), "existing").ok();

        let result = copy_item(&src, &dst_dir);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("already exists"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn copy_symlink_preserves_link() {
        let dir = std::env::temp_dir().join("ray-fb-test-copy-unit-symlink");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();

        let target = dir.join("target.txt");
        std::fs::write(&target, "hello").ok();
        let link = dir.join("link.txt");
        symlink(&target, &link).ok();

        let dst_dir = dir.join("destination");
        std::fs::create_dir_all(&dst_dir).ok();

        let result = copy_item(&link, &dst_dir);
        assert!(result.is_ok(), "symlink copy should succeed: {:?}", result);

        let dst = dst_dir.join("link.txt");
        let dst_meta = std::fs::symlink_metadata(&dst)
            .expect("destination should exist");
        assert!(dst_meta.is_symlink(), "destination should be a symlink, not a regular file");

        let copied_target = std::fs::read_link(&dst).expect("should read link target");
        assert_eq!(copied_target, target, "symlink target should match original");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn copy_symlink_in_directory() {
        let dir = std::env::temp_dir().join("ray-fb-test-copy-unit-symlink-in-dir");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();

        let src_dir = dir.join("src");
        std::fs::create_dir_all(&src_dir).ok();
        let target = src_dir.join("real.txt");
        std::fs::write(&target, "data").ok();
        symlink("real.txt", src_dir.join("alias.txt")).ok();

        let dst_dir = dir.join("destination");
        std::fs::create_dir_all(&dst_dir).ok();

        let result = copy_item(&src_dir, &dst_dir);
        assert!(result.is_ok(), "dir copy with symlink should succeed: {:?}", result);

        let alias_dst = dst_dir.join("src").join("alias.txt");
        let meta = std::fs::symlink_metadata(&alias_dst)
            .expect("symlink inside dir should exist at destination");
        assert!(meta.is_symlink(), "inner entry should still be a symlink");

        let link_target = std::fs::read_link(&alias_dst).unwrap();
        assert_eq!(link_target, std::path::Path::new("real.txt"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn copy_partial_failure_cleans_up() {
        use std::os::unix::fs::PermissionsExt;

        let dir = std::env::temp_dir().join("ray-fb-test-copy-unit-partial");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();

        let src_dir = dir.join("src");
        std::fs::create_dir_all(src_dir.join("sub")).ok();
        std::fs::write(src_dir.join("a.txt"), "ok").ok();
        std::fs::write(src_dir.join("sub").join("b.txt"), "deny").ok();

        // Make subdirectory unreadable to force a failure during recursion
        let mut perms = std::fs::metadata(&src_dir.join("sub")).unwrap().permissions();
        perms.set_mode(0o000);
        std::fs::set_permissions(src_dir.join("sub"), perms).ok();

        let dst_dir = dir.join("destination");
        std::fs::create_dir_all(&dst_dir).ok();

        let result = copy_item(&src_dir, &dst_dir);
        assert!(result.is_err(), "copy should fail due to unreadable subdir");

        // Partially created destination should have been cleaned up
        assert!(
            !dst_dir.join("src").exists(),
            "no partial tree should remain after failure"
        );

        // Restore permissions for cleanup
        let mut perms = std::fs::metadata(&src_dir.join("sub")).unwrap().permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(src_dir.join("sub"), perms).ok();

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn copy_dangling_symlink_succeeds() {
        let dir = std::env::temp_dir().join("ray-fb-test-copy-unit-dangling");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();

        // Create a symlink pointing to a nonexistent target
        let link = dir.join("dangling.txt");
        symlink("/no/such/target/ray-fb-test", &link).ok();

        let dst_dir = dir.join("destination");
        std::fs::create_dir_all(&dst_dir).ok();

        let result = copy_item(&link, &dst_dir);
        assert!(result.is_ok(), "dangling symlink copy should succeed: {:?}", result);

        let dst = dst_dir.join("dangling.txt");
        let meta = std::fs::symlink_metadata(&dst).expect("destination should exist");
        assert!(meta.is_symlink(), "destination should be a symlink");

        let target = std::fs::read_link(&dst).unwrap();
        assert_eq!(target, std::path::Path::new("/no/such/target/ray-fb-test"));

        let _ = std::fs::remove_dir_all(&dir);
    }
}
