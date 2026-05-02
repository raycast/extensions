use std::error::Error;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use super::copy::copy_item;

/// Move a file or directory to a destination directory.
///
/// Uses `std::fs::rename` for same-filesystem moves (atomic).
/// When `rename` fails with `EXDEV` (cross-device), falls back to copy+delete
/// using the hardened `copy_item` path.
///
/// Returns the full path of the moved item. Errors if source doesn't exist,
/// destination dir doesn't exist, a same-named item already exists at destination,
/// or a directory is moved into itself or one of its descendants.
pub fn move_item(src: &Path, dst_dir: &Path) -> Result<PathBuf, Box<dyn Error>> {
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

    if dst.symlink_metadata().is_ok() {
        return Err(format!(
            "A file or folder named \"{}\" already exists in this location.",
            name.to_string_lossy()
        )
        .into());
    }

    if src_meta.is_dir() {
        if let (Ok(canonical_src), Ok(canonical_dst)) =
            (src.canonicalize(), dst_dir.canonicalize())
        {
            // Path::starts_with does component-wise comparison, so
            // /tmp/src/child starts_with /tmp/src is true, but
            // /tmp/srcother starts_with /tmp/src is false.
            if canonical_dst.starts_with(&canonical_src) {
                return Err(format!(
                    "Cannot move directory into itself or a descendant: {} → {}",
                    src.display(),
                    dst_dir.display()
                )
                .into());
            }
        }
    }

    match fs::rename(src, &dst) {
        Ok(()) => Ok(dst),
        Err(e) if e.kind() == io::ErrorKind::CrossesDevices => {
            let copied = copy_item(src, dst_dir)?;

            // Delete source only after copy fully succeeds
            let delete_result = if src_meta.is_dir() {
                fs::remove_dir_all(src)
            } else {
                fs::remove_file(src)
            };

            match delete_result {
                Ok(()) => Ok(copied),
                Err(del_err) => {
                    // Destination preserved — do NOT delete it
                    Err(format!(
                        "partial move: item copied to {} but source could not be deleted: {}",
                        copied.display(),
                        del_err
                    )
                    .into())
                }
            }
        }
        Err(e) => Err(e.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn move_file_succeeds() {
        let dir = std::env::temp_dir().join("ray-fb-test-move-unit-file");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();
        let src = dir.join("source.txt");
        std::fs::write(&src, "hello").ok();
        let dst_dir = dir.join("destination");
        std::fs::create_dir_all(&dst_dir).ok();

        let result = move_item(&src, &dst_dir);
        assert!(result.is_ok(), "move should succeed: {:?}", result);
        let moved = result.unwrap();
        assert_eq!(moved, dst_dir.join("source.txt"));
        assert!(dst_dir.join("source.txt").exists());
        assert!(!src.exists(), "source should be gone after move");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn move_nonexistent_source_fails() {
        let result = move_item(Path::new("/no/such/file/ray-fb-test"), Path::new("/tmp"));
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[test]
    fn move_to_nonexistent_dir_fails() {
        let dir = std::env::temp_dir().join("ray-fb-test-move-unit-nodest");
        std::fs::create_dir_all(&dir).ok();
        let src = dir.join("source.txt");
        std::fs::write(&src, "hello").ok();

        let result = move_item(&src, Path::new("/no/such/dir/ray-fb-test"));
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn move_existing_name_fails() {
        let dir = std::env::temp_dir().join("ray-fb-test-move-unit-exists");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();
        let src = dir.join("source.txt");
        std::fs::write(&src, "hello").ok();
        let dst_dir = dir.join("dest");
        std::fs::create_dir_all(&dst_dir).ok();
        std::fs::write(dst_dir.join("source.txt"), "existing").ok();

        let result = move_item(&src, &dst_dir);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("already exists"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn move_dir_into_itself_rejected() {
        let dir = std::env::temp_dir().join("ray-fb-test-move-unit-self");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("child")).ok();

        let result = move_item(&dir, &dir.join("child"));
        assert!(result.is_err());
        let msg = result.unwrap_err().to_string();
        assert!(
            msg.contains("descendant"),
            "expected descendant rejection, got: {msg}"
        );

        assert!(dir.exists(), "source directory should still exist");
        assert!(dir.join("child").is_dir(), "child should still be a dir");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn move_dir_into_nested_descendant_rejected() {
        let dir = std::env::temp_dir().join("ray-fb-test-move-unit-nested");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("a").join("b")).ok();

        let result = move_item(&dir, &dir.join("a").join("b"));
        assert!(result.is_err());
        let msg = result.unwrap_err().to_string();
        assert!(
            msg.contains("descendant"),
            "expected descendant rejection, got: {msg}"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn move_dir_into_unrelated_dir_succeeds() {
        let base = std::env::temp_dir().join("ray-fb-test-move-unit-unrelated");
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(base.join("src").join("inner")).ok();
        std::fs::write(base.join("src").join("inner").join("f.txt"), "data").ok();
        std::fs::create_dir_all(base.join("dst")).ok();

        let result = move_item(&base.join("src"), &base.join("dst"));
        assert!(result.is_ok(), "move to unrelated dir should succeed: {:?}", result);
        assert!(base.join("dst").join("src").join("inner").join("f.txt").exists());
        assert!(!base.join("src").exists());

        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn move_dir_into_sibling_not_descendant_succeeds() {
        let base = std::env::temp_dir().join("ray-fb-test-move-unit-sibling");
        let _ = std::fs::remove_dir_all(&base);
        let src = base.join("parent").join("src");
        let dst = base.join("parent").join("dst");
        std::fs::create_dir_all(&src).ok();
        std::fs::create_dir_all(&dst).ok();
        std::fs::write(src.join("file.txt"), "hello").ok();

        let result = move_item(&src, &dst);
        assert!(result.is_ok(), "sibling move should succeed: {:?}", result);
        assert!(dst.join("src").join("file.txt").exists());
        assert!(!src.exists());

        let _ = std::fs::remove_dir_all(&base);
    }
}
