use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

use super::rename::normalize_new_name;

/// Create a new folder inside `dir` with the given `name`.
///
/// Validates the name using the same rules as rename, then creates
/// the directory. Returns the full path of the created folder.
pub fn create_folder(dir: &Path, name: &str) -> Result<PathBuf, Box<dyn Error>> {
    let validated_name = normalize_new_name(name)?;

    if !dir.exists() {
        return Err(format!("directory not found: {}", dir.display()).into());
    }
    if !dir.is_dir() {
        return Err(format!("not a directory: {}", dir.display()).into());
    }

    let new_path = dir.join(&validated_name);
    if new_path.exists() {
        return Err(format!(
            "A file or folder named \"{}\" already exists in this location.",
            validated_name
        )
        .into());
    }

    fs::create_dir(&new_path)?;
    Ok(new_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_folder_succeeds() {
        let dir = std::env::temp_dir().join("ray-fb-test-create-unit-ok");
        std::fs::create_dir_all(&dir).ok();
        let result = create_folder(&dir, "new-folder");
        assert!(result.is_ok(), "expected ok, got: {:?}", result.unwrap_err());
        let path = result.unwrap();
        assert!(path.exists());
        assert!(path.is_dir());
        assert_eq!(path.file_name().unwrap(), "new-folder");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn create_folder_rejects_colon() {
        let dir = std::env::temp_dir().join("ray-fb-test-create-unit-colon");
        std::fs::create_dir_all(&dir).ok();
        let result = create_folder(&dir, "bad:name");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains(':'));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn create_folder_rejects_dot() {
        let dir = std::env::temp_dir().join("ray-fb-test-create-unit-dot");
        std::fs::create_dir_all(&dir).ok();
        let result = create_folder(&dir, ".");
        assert!(result.is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn create_folder_rejects_empty() {
        let dir = std::env::temp_dir().join("ray-fb-test-create-unit-empty");
        std::fs::create_dir_all(&dir).ok();
        let result = create_folder(&dir, "");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Name is required"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn create_folder_nonexistent_parent() {
        let result = create_folder(Path::new("/no/such/path/ray-fb-test"), "test");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[test]
    fn create_folder_already_exists() {
        let dir = std::env::temp_dir().join("ray-fb-test-create-unit-exists");
        std::fs::create_dir_all(&dir).ok();
        std::fs::create_dir(dir.join("existing")).ok();
        let result = create_folder(&dir, "existing");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("already exists"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
