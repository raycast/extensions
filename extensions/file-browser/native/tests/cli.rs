//! CLI integration tests for the `ray-fb` binary.
//!
//! Exercises the full command surface through `std::process::Command`,
//! verifying exit codes, output shape, and error handling.

use std::process::Command;

fn ray_fb() -> Command {
    Command::new(env!("CARGO_BIN_EXE_ray-fb"))
}

fn assert_exit(code: i32, output: &std::process::Output) {
    let actual = output.status.code().unwrap_or(-1);
    assert_eq!(
        actual, code,
        "expected exit code {code}, got {actual}\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
    );
}

#[test]
fn help_flag_outputs_usage_text() {
    let output = ray_fb().arg("--help").output().unwrap();
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("ray-fb"), "help should mention ray-fb");
    assert!(stdout.contains("items"), "help should list items command");
    assert!(stdout.contains("tags"), "help should list tags command");
}

#[test]
fn version_flag_outputs_version() {
    let output = ray_fb().arg("--version").output().unwrap();
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("ray-fb"), "version should mention ray-fb");
}

#[test]
fn bogus_command_exits_2() {
    let output = ray_fb().arg("bogus-command").output().unwrap();
    assert_exit(2, &output);
}

#[test]
fn items_list_on_tmp_exits_0() {
    let output = ray_fb()
        .args(["items", "list", "--path", "/tmp", "--sort", "name-asc", "--show-hidden", "false"])
        .output()
        .unwrap();
    assert_exit(0, &output);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("items list should produce valid JSON: {e}\noutput: {stdout}");
    });
    assert!(parsed.is_array(), "items list should return a JSON array");
}

#[test]
fn items_list_bogus_sort_exits_2() {
    let output = ray_fb()
        .args(["items", "list", "--path", "/tmp", "--sort", "bogus-mode", "--show-hidden", "false"])
        .output()
        .unwrap();
    assert_exit(2, &output);
}

#[test]
fn items_list_nonexistent_path_exits_3() {
    let output = ray_fb()
        .args(["items", "list", "--path", "/no/such/directory/ray-fb-test", "--sort", "name-asc", "--show-hidden", "false"])
        .output()
        .unwrap();
    assert_exit(3, &output);
}

#[test]
fn items_list_not_a_directory_exits_2() {
    let output = ray_fb()
        .args(["items", "list", "--path", "/etc/hosts", "--sort", "name-asc", "--show-hidden", "false"])
        .output()
        .unwrap();
    assert_exit(2, &output);
}

#[test]
fn item_rename_nonexistent_exits_3() {
    let output = ray_fb()
        .args(["item", "rename", "--path", "/tmp/no-such-file-ray-fb-test", "--to", "test"])
        .output()
        .unwrap();
    assert_exit(3, &output);
}

#[test]
fn tags_list_exits_0() {
    let output = ray_fb().args(["tags", "list"]).output().unwrap();
    assert_exit(0, &output);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("tags list should produce valid JSON: {e}\noutput: {stdout}");
    });
    assert!(parsed.is_array(), "tags list should return a JSON array");
}

#[test]
fn item_locked_get_on_tmp_exits_0() {
    let output = ray_fb()
        .args(["item", "locked", "get", "--path", "/tmp"])
        .output()
        .unwrap();
    assert_exit(0, &output);
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    assert!(
        stdout == "true" || stdout == "false",
        "locked get should output 'true' or 'false', got: {stdout}",
    );
}

#[test]
fn item_locked_get_nonexistent_exits_3() {
    let output = ray_fb()
        .args(["item", "locked", "get", "--path", "/tmp/no-such-file-ray-fb-test"])
        .output()
        .unwrap();
    assert_exit(3, &output);
}

#[test]
fn all_sort_modes_are_accepted() {
    let modes = [
        "name-asc",
        "kind-asc",
        "date-last-opened-asc",
        "date-added-desc",
        "date-modified-asc",
        "date-created-asc",
        "size-asc",
        "tags-asc",
    ];
    for mode in &modes {
        let output = ray_fb()
            .args(["items", "list", "--path", "/tmp", "--sort", mode, "--show-hidden", "false"])
            .output()
            .unwrap_or_else(|e| panic!("failed to run ray-fb with sort {mode}: {e}"));
        assert_eq!(
            output.status.code(),
            Some(0),
            "sort mode '{mode}' should exit 0\nstderr: {}",
            String::from_utf8_lossy(&output.stderr),
        );
    }
}

#[test]
fn show_hidden_true_and_false_both_accepted() {
    for val in &["true", "false"] {
        let output = ray_fb()
            .args(["items", "list", "--path", "/tmp", "--sort", "name-asc", "--show-hidden", val])
            .output()
            .unwrap();
        assert_exit(0, &output);
    }
}

#[test]
fn show_hidden_invalid_exits_2() {
    let output = ray_fb()
        .args(["items", "list", "--path", "/tmp", "--sort", "name-asc", "--show-hidden", "yes"])
        .output()
        .unwrap();
    assert_exit(2, &output);
}

#[test]
fn missing_required_args_exits_2() {
    let output = ray_fb().args(["items", "list"]).output().unwrap();
    assert_exit(2, &output);
}

#[test]
fn item_rename_dotdot_exits_2() {
    let dir = std::env::temp_dir().join("ray-fb-test-rename-dotdot");
    std::fs::create_dir_all(&dir).ok();
    let file = dir.join("test.txt");
    std::fs::File::create(&file).ok();

    let output = ray_fb()
        .args(["item", "rename", "--path", file.to_str().unwrap(), "--to", ".."])
        .output()
        .unwrap();
    assert_exit(2, &output);

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_rename_colon_exits_2() {
    let dir = std::env::temp_dir().join("ray-fb-test-rename-colon-cli");
    std::fs::create_dir_all(&dir).ok();
    let file = dir.join("test.txt");
    std::fs::File::create(&file).ok();

    let output = ray_fb()
        .args(["item", "rename", "--path", file.to_str().unwrap(), "--to", ":bad"])
        .output()
        .unwrap();
    assert_exit(2, &output);

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_tags_replace_blue_exits_0() {
    let dir = std::env::temp_dir().join("ray-fb-test-tags-blue");
    std::fs::create_dir_all(&dir).ok();
    let file = dir.join("test.txt");
    std::fs::File::create(&file).ok();

    let output = ray_fb()
        .args(["item", "tags", "replace", "--path", file.to_str().unwrap(), "--values", "Blue"])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_tags_replace_clear_exits_0() {
    let dir = std::env::temp_dir().join("ray-fb-test-tags-clear");
    std::fs::create_dir_all(&dir).ok();
    let file = dir.join("test.txt");
    std::fs::File::create(&file).ok();

    let output = ray_fb()
        .args(["item", "tags", "replace", "--path", file.to_str().unwrap(), "--values"])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_create_folder_valid() {
    let dir = std::env::temp_dir().join("ray-fb-test-create-valid");
    std::fs::create_dir_all(&dir).ok();
    let output = ray_fb()
        .args(["item", "create", "--path", dir.to_str().unwrap(), "--name", "new-folder"])
        .output()
        .unwrap();
    assert_exit(0, &output);
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    assert!(stdout.contains("new-folder"));
    assert!(dir.join("new-folder").exists());
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_create_folder_colon_exits_2() {
    let dir = std::env::temp_dir().join("ray-fb-test-create-colon");
    std::fs::create_dir_all(&dir).ok();
    let output = ray_fb()
        .args(["item", "create", "--path", dir.to_str().unwrap(), "--name", "bad:name"])
        .output()
        .unwrap();
    assert_exit(2, &output);
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_create_folder_no_parent_exits_3() {
    let output = ray_fb()
        .args(["item", "create", "--path", "/no/such/path/ray-fb-test", "--name", "test"])
        .output()
        .unwrap();
    assert_exit(3, &output);
}

#[test]
fn item_create_folder_dot_exits_2() {
    let dir = std::env::temp_dir().join("ray-fb-test-create-dot");
    std::fs::create_dir_all(&dir).ok();
    let output = ray_fb()
        .args(["item", "create", "--path", dir.to_str().unwrap(), "--name", "."])
        .output()
        .unwrap();
    assert_exit(2, &output);
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_copy_file_to_dir() {
    let dir = std::env::temp_dir().join("ray-fb-test-copy-file");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();
    let src = dir.join("source.txt");
    std::fs::write(&src, "hello").ok();
    let dst_dir = dir.join("destination");
    std::fs::create_dir_all(&dst_dir).ok();

    let output = ray_fb()
        .args(["item", "copy", "--path", src.to_str().unwrap(), "--to", dst_dir.to_str().unwrap()])
        .output()
        .unwrap();
    assert_exit(0, &output);
    assert!(dst_dir.join("source.txt").exists());
    assert!(src.exists(), "source should still exist after copy");
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_copy_no_source_exits_3() {
    let output = ray_fb()
        .args(["item", "copy", "--path", "/no/such/file/ray-fb-test", "--to", "/tmp"])
        .output()
        .unwrap();
    assert_exit(3, &output);
}

#[test]
fn item_copy_no_dest_dir_exits_3() {
    let dir = std::env::temp_dir().join("ray-fb-test-copy-nodest");
    std::fs::create_dir_all(&dir).ok();
    let src = dir.join("source.txt");
    std::fs::write(&src, "hello").ok();

    let output = ray_fb()
        .args(["item", "copy", "--path", src.to_str().unwrap(), "--to", "/no/such/dir/ray-fb-test"])
        .output()
        .unwrap();
    assert_exit(3, &output);
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_copy_existing_name_exits_2() {
    let dir = std::env::temp_dir().join("ray-fb-test-copy-exists");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();
    let src = dir.join("source.txt");
    std::fs::write(&src, "hello").ok();
    let dst_dir = dir.join("dest");
    std::fs::create_dir_all(&dst_dir).ok();
    std::fs::write(dst_dir.join("source.txt"), "existing").ok();

    let output = ray_fb()
        .args(["item", "copy", "--path", src.to_str().unwrap(), "--to", dst_dir.to_str().unwrap()])
        .output()
        .unwrap();
    assert!(
        output.status.code() == Some(2) || output.status.code() == Some(1),
        "expected exit 2 or 1 for existing destination, got {:?}\nstderr: {}",
        output.status.code(),
        String::from_utf8_lossy(&output.stderr)
    );
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_thumbnail_for_tmp_exits_0_or_5() {
    let dir = std::env::temp_dir().join("ray-fb-test-thumb");
    std::fs::create_dir_all(&dir).ok();
    let file = dir.join("test.txt");
    std::fs::write(&file, "hello world").ok();

    let output = ray_fb()
        .args(["item", "thumbnail", "--path", file.to_str().unwrap()])
        .output()
        .unwrap();
    let code = output.status.code().unwrap_or(-1);
    assert!(
        code == 0 || code == 5,
        "expected exit 0 or 5, got {}\nstdout: {}\nstderr: {}",
        code,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
    );

    if code == 0 {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        assert!(
            stdout.ends_with(".png"),
            "thumbnail output should be a .png path, got: {stdout}",
        );
        assert!(
            std::path::Path::new(&stdout).exists(),
            "thumbnail file should exist at {stdout}",
        );
    }

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_thumbnail_nonexistent_exits_3() {
    let output = ray_fb()
        .args(["item", "thumbnail", "--path", "/no/such/file/ray-fb-test"])
        .output()
        .unwrap();
    assert_exit(3, &output);
}

#[test]
fn item_copy_symlink_preserves_link() {
    let dir = std::env::temp_dir().join("ray-fb-test-copy-symlink-cli");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();

    let target = dir.join("target.txt");
    std::fs::write(&target, "hello").ok();
    let link = dir.join("link.txt");
    std::os::unix::fs::symlink(&target, &link).ok();

    let dst_dir = dir.join("destination");
    std::fs::create_dir_all(&dst_dir).ok();

    let output = ray_fb()
        .args(["item", "copy", "--path", link.to_str().unwrap(), "--to", dst_dir.to_str().unwrap()])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let dst = dst_dir.join("link.txt");
    let meta = std::fs::symlink_metadata(&dst).expect("destination should exist");
    assert!(meta.is_symlink(), "destination should be a symlink, not a regular file");

    let copied_target = std::fs::read_link(&dst).expect("should read link target");
    assert_eq!(
        copied_target, target,
        "symlink target should match original"
    );

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_copy_partial_failure_cleans_up() {
    use std::os::unix::fs::PermissionsExt;

    let dir = std::env::temp_dir().join("ray-fb-test-copy-partial-cli");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();

    let src_dir = dir.join("src");
    std::fs::create_dir_all(src_dir.join("sub")).ok();
    std::fs::write(src_dir.join("a.txt"), "ok").ok();
    std::fs::write(src_dir.join("sub").join("b.txt"), "deny").ok();

    let mut perms = std::fs::metadata(src_dir.join("sub")).unwrap().permissions();
    perms.set_mode(0o000);
    std::fs::set_permissions(src_dir.join("sub"), perms).ok();

    let dst_dir = dir.join("dst");
    std::fs::create_dir_all(&dst_dir).ok();

    let output = ray_fb()
        .args(["item", "copy", "--path", src_dir.to_str().unwrap(), "--to", dst_dir.to_str().unwrap()])
        .output()
        .unwrap();
    assert!(
        output.status.code().unwrap_or(0) != 0,
        "copy should fail due to unreadable subdir"
    );

    assert!(
        !dst_dir.join("src").exists(),
        "no partial tree should remain after failure"
    );

    let mut perms = std::fs::metadata(src_dir.join("sub")).unwrap().permissions();
    perms.set_mode(0o755);
    std::fs::set_permissions(src_dir.join("sub"), perms).ok();

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_copy_preserves_xattrs() {
    let dir = std::env::temp_dir().join("ray-fb-test-copy-xattr-cli");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();

    let src = dir.join("source.txt");
    std::fs::write(&src, "hello").ok();

    let xattr_set = Command::new("xattr")
        .args(["-w", "com.voyager.test", "test_value", src.to_str().unwrap()])
        .output()
        .unwrap();
    if !xattr_set.status.success() {
        let _ = std::fs::remove_dir_all(&dir);
        return;
    }

    let dst_dir = dir.join("destination");
    std::fs::create_dir_all(&dst_dir).ok();

    let output = ray_fb()
        .args(["item", "copy", "--path", src.to_str().unwrap(), "--to", dst_dir.to_str().unwrap()])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let dst = dst_dir.join("source.txt");
    let xattr_check = Command::new("xattr")
        .args(["-p", "com.voyager.test", dst.to_str().unwrap()])
        .output()
        .unwrap();
    assert!(
        xattr_check.status.success(),
        "xattr should be preserved at destination"
    );
    let value = String::from_utf8_lossy(&xattr_check.stdout);
    assert_eq!(
        value.trim(),
        "test_value",
        "xattr value should match original"
    );

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_move_file_to_dir() {
    let dir = std::env::temp_dir().join("ray-fb-test-move-file");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();
    let src = dir.join("source.txt");
    std::fs::write(&src, "hello").ok();
    let dst_dir = dir.join("destination");
    std::fs::create_dir_all(&dst_dir).ok();

    let output = ray_fb()
        .args(["item", "move", "--path", src.to_str().unwrap(), "--to", dst_dir.to_str().unwrap()])
        .output()
        .unwrap();
    assert_exit(0, &output);
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    assert!(stdout.contains("source.txt"));
    assert!(dst_dir.join("source.txt").exists(), "file should exist at destination");
    assert!(!src.exists(), "source should no longer exist after move");
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_move_no_source_exits_3() {
    let output = ray_fb()
        .args(["item", "move", "--path", "/no/such/file/ray-fb-test", "--to", "/tmp"])
        .output()
        .unwrap();
    assert_exit(3, &output);
}

#[test]
fn item_move_no_dest_dir_exits_3() {
    let dir = std::env::temp_dir().join("ray-fb-test-move-nodest");
    std::fs::create_dir_all(&dir).ok();
    let src = dir.join("source.txt");
    std::fs::write(&src, "hello").ok();

    let output = ray_fb()
        .args(["item", "move", "--path", src.to_str().unwrap(), "--to", "/no/such/dir/ray-fb-test"])
        .output()
        .unwrap();
    assert_exit(3, &output);
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_move_dir_into_descendant_exits_1() {
    let dir = std::env::temp_dir().join("ray-fb-test-move-descendant");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("child")).ok();
    std::fs::write(dir.join("child").join("f.txt"), "data").ok();

    let output = ray_fb()
        .args(["item", "move", "--path", dir.to_str().unwrap(), "--to", dir.join("child").to_str().unwrap()])
        .output()
        .unwrap();
    let code = output.status.code().unwrap_or(-1);
    assert_ne!(code, 0, "moving directory into descendant should fail");

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("descendant") || stderr.contains("itself"),
        "error should mention descendant or itself, got: {stderr}"
    );

    assert!(dir.join("child").is_dir(), "child directory should still exist");
    assert!(dir.join("child/f.txt").exists(), "child content should be intact");

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_move_dir_into_nested_descendant_exits_1() {
    let dir = std::env::temp_dir().join("ray-fb-test-move-nested-desc");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("a").join("b")).ok();

    let output = ray_fb()
        .args(["item", "move", "--path", dir.to_str().unwrap(), "--to", dir.join("a/b").to_str().unwrap()])
        .output()
        .unwrap();
    let code = output.status.code().unwrap_or(-1);
    assert_ne!(code, 0, "moving directory into nested descendant should fail");

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("descendant") || stderr.contains("itself"),
        "error should mention descendant or itself, got: {stderr}"
    );

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_move_existing_name_exits_2() {
    let dir = std::env::temp_dir().join("ray-fb-test-move-exists-cli");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();
    let src = dir.join("source.txt");
    std::fs::write(&src, "hello").ok();
    let dst_dir = dir.join("dest");
    std::fs::create_dir_all(&dst_dir).ok();
    std::fs::write(dst_dir.join("source.txt"), "existing").ok();

    let output = ray_fb()
        .args(["item", "move", "--path", src.to_str().unwrap(), "--to", dst_dir.to_str().unwrap()])
        .output()
        .unwrap();
    let code = output.status.code().unwrap_or(-1);
    assert!(
        code == 2 || code == 1,
        "expected exit 2 or 1 for existing destination, got {code}"
    );

    assert!(src.exists(), "source should still exist after failed move");

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_move_symlink_to_dir() {
    let dir = std::env::temp_dir().join("ray-fb-test-move-symlink");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();
    let target = dir.join("target.txt");
    std::fs::write(&target, "hello").ok();
    let link = dir.join("link.txt");
    std::os::unix::fs::symlink(&target, &link).ok();
    let dst_dir = dir.join("dest");
    std::fs::create_dir_all(&dst_dir).ok();

    let output = ray_fb()
        .args(["item", "move", "--path", link.to_str().unwrap(), "--to", dst_dir.to_str().unwrap()])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let moved = dst_dir.join("link.txt");
    let meta = std::fs::symlink_metadata(&moved).expect("moved symlink should exist");
    assert!(meta.is_symlink(), "moved item should still be a symlink");
    assert!(!link.exists(), "source symlink should be gone");

    let _ = std::fs::remove_dir_all(&dir);
}

/// Creates a small APFS disk image, mounts it, and verifies that
/// `item move` correctly falls back to copy-then-delete when `rename(2)`
/// fails with EXDEV (cross-filesystem).
#[test]
fn item_move_cross_filesystem_exdev() {
    let dir = std::env::temp_dir().join("ray-fb-test-move-exdev");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();

    let dmg = dir.join("exdev.dmg");
    let mkfs = Command::new("hdiutil")
        .args([
            "create",
            "-size",
            "1m",
            "-fs",
            "APFS",
            "-type",
            "SPARSE",
            dmg.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    if !mkfs.status.success() {
        eprintln!(
            "SKIP item_move_cross_filesystem_exdev: hdiutil create failed: {}",
            String::from_utf8_lossy(&mkfs.stderr)
        );
        let _ = std::fs::remove_dir_all(&dir);
        return;
    }

    let sparse_path = dir.join("exdev.sparseimage");
    let attach = Command::new("hdiutil")
        .args(["attach", "-nobrowse", "-mountpoint", "/tmp/ray-fb-exdev-mount", sparse_path.to_str().unwrap()])
        .output()
        .unwrap();
    if !attach.status.success() {
        eprintln!(
            "SKIP item_move_cross_filesystem_exdev: hdiutil attach failed: {}",
            String::from_utf8_lossy(&attach.stderr)
        );
        let _ = std::fs::remove_dir_all(&dir);
        return;
    }

    let src = dir.join("source.txt");
    std::fs::write(&src, "cross-fs data").ok();

    let mount_point = std::path::Path::new("/tmp/ray-fb-exdev-mount");

    let output = ray_fb()
        .args(["item", "move", "--path", src.to_str().unwrap(), "--to", mount_point.to_str().unwrap()])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let dst = mount_point.join("source.txt");
    assert!(dst.exists(), "file should exist at cross-fs destination");
    assert_eq!(std::fs::read_to_string(&dst).unwrap(), "cross-fs data");
    assert!(!src.exists(), "source should be gone after cross-fs move");

    let _ = Command::new("hdiutil")
        .args(["detach", mount_point.to_str().unwrap(), "-force"])
        .output();
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_comment_set_and_read_back() {
    let dir = std::env::temp_dir().join("ray-fb-test-comment-cli");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();
    let file = dir.join("comment.txt");
    std::fs::write(&file, "hello").ok();

    // Set comment via CLI
    let output = ray_fb()
        .args([
            "item",
            "comment",
            "set",
            "--path",
            file.to_str().unwrap(),
            "--value",
            "Test comment",
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    // Read back via osascript to verify
    let readback = Command::new("osascript")
        .args([
            "-e",
            &format!(
                "set posixPath to {}",
                serde_json::to_string(file.to_str().unwrap()).unwrap()
            ),
            "-e",
            "set theFile to POSIX file posixPath as alias",
            "-e",
            "tell application \"Finder\" to get comment of theFile",
        ])
        .output()
        .unwrap();
    assert!(
        readback.status.success(),
        "osascript read-back failed: {}",
        String::from_utf8_lossy(&readback.stderr)
    );
    let comment = String::from_utf8_lossy(&readback.stdout).trim().to_string();
    assert_eq!(comment, "Test comment", "comment read-back mismatch");

    // Test clearing: set to empty string
    let output = ray_fb()
        .args([
            "item",
            "comment",
            "set",
            "--path",
            file.to_str().unwrap(),
            "--value",
            "",
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let readback = Command::new("osascript")
        .args([
            "-e",
            &format!(
                "set posixPath to {}",
                serde_json::to_string(file.to_str().unwrap()).unwrap()
            ),
            "-e",
            "set theFile to POSIX file posixPath as alias",
            "-e",
            "tell application \"Finder\" to get comment of theFile",
        ])
        .output()
        .unwrap();
    let cleared = String::from_utf8_lossy(&readback.stdout).trim().to_string();
    assert_eq!(cleared, "", "clearing comment should result in empty string");

    let special = "Hello 日本語 \"quotes\"";
    let output = ray_fb()
        .args([
            "item",
            "comment",
            "set",
            "--path",
            file.to_str().unwrap(),
            "--value",
            special,
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let readback = Command::new("osascript")
        .args([
            "-e",
            &format!(
                "set posixPath to {}",
                serde_json::to_string(file.to_str().unwrap()).unwrap()
            ),
            "-e",
            "set theFile to POSIX file posixPath as alias",
            "-e",
            "tell application \"Finder\" to get comment of theFile",
        ])
        .output()
        .unwrap();
    let read_back = String::from_utf8_lossy(&readback.stdout).trim().to_string();
    assert!(
        !read_back.is_empty(),
        "comment should not be empty after round-trip"
    );
    assert!(
        read_back.contains("Hello"),
        "comment should preserve content, got: {read_back}"
    );
    assert!(
        read_back.contains("日本語"),
        "comment should preserve unicode, got: {read_back}"
    );

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn item_comment_set_nonexistent_exits_3() {
    let output = ray_fb()
        .args([
            "item",
            "comment",
            "set",
            "--path",
            "/no/such/file/ray-fb-comment-test",
            "--value",
            "test",
        ])
        .output()
        .unwrap();
    assert_exit(3, &output);
}

#[test]
fn items_list_app_bundle_is_package_like() {
    let dir = std::env::temp_dir().join("ray-fb-test-cli-pkg");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("Fake.app").join("Contents")).ok();
    std::fs::write(dir.join("Fake.app").join("Contents").join("Info.plist"), "").ok();

    let output = ray_fb()
        .args([
            "items",
            "list",
            "--path",
            dir.to_str().unwrap(),
            "--sort",
            "name-asc",
            "--show-hidden",
            "false",
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("items list should produce valid JSON: {e}\noutput: {stdout}");
    });
    let items = parsed.as_array().expect("items list should return a JSON array");
    let fake_app = items
        .iter()
        .find(|i| i["name"].as_str().unwrap_or("") == "Fake.app")
        .expect("Fake.app should appear in listing");
    assert_eq!(
        fake_app["isPackageLike"].as_bool(),
        Some(true),
        "Fake.app should have isPackageLike=true, got: {fake_app}"
    );

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn items_list_plain_dir_not_package_like_or_mount_root() {
    let dir = std::env::temp_dir().join("ray-fb-test-cli-plain");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("subdir")).ok();
    std::fs::write(dir.join("file.txt"), "data").ok();

    let output = ray_fb()
        .args([
            "items",
            "list",
            "--path",
            dir.to_str().unwrap(),
            "--sort",
            "name-asc",
            "--show-hidden",
            "false",
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("items list should produce valid JSON: {e}\noutput: {stdout}");
    });
    let items = parsed.as_array().expect("items list should return a JSON array");

    for item in items {
        let name = item["name"].as_str().unwrap_or("");
        if item["type"].as_str() == Some("file") {
            assert_eq!(
                item["isPackageLike"].as_bool(),
                Some(false),
                "{name} (file) should have isPackageLike=false"
            );
            assert_eq!(
                item["isMountRoot"].as_bool(),
                Some(false),
                "{name} (file) should have isMountRoot=false"
            );
        } else if name == "subdir" {
            assert_eq!(
                item["isPackageLike"].as_bool(),
                Some(false),
                "subdir should have isPackageLike=false"
            );
            assert_eq!(
                item["isMountRoot"].as_bool(),
                Some(false),
                "subdir should have isMountRoot=false"
            );
        }
    }

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn items_search_returns_json_for_valid_predicate() {
    let dir = std::env::temp_dir().join("ray-fb-test-search-valid");
    std::fs::create_dir_all(&dir).ok();
    let file = dir.join("test-search.txt");
    std::fs::write(&file, "hello search").ok();

    let output = ray_fb()
        .args([
            "items",
            "search",
            "--only-in",
            "/tmp",
            "--predicate",
            "kMDItemFSName == 'hosts'",
        ])
        .output()
        .unwrap();
    let code = output.status.code().unwrap_or(-1);
    assert_eq!(
        code, 0,
        "search with valid predicate should exit 0, got {}\nstderr: {}",
        code,
        String::from_utf8_lossy(&output.stderr),
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("search should produce valid JSON: {e}\noutput: {stdout}");
    });
    assert!(
        parsed.get("paths").is_some(),
        "search result should have 'paths' field, got: {parsed}"
    );
    assert!(
        parsed.get("isTruncated").is_some(),
        "search result should have 'isTruncated' field"
    );
    assert!(
        parsed.get("isTimedOut").is_some(),
        "search result should have 'isTimedOut' field"
    );
}

#[test]
fn items_search_invalid_predicate_exits_usage() {
    let output = ray_fb()
        .args([
            "items",
            "search",
            "--only-in",
            "/tmp",
            "--predicate",
            "this is not a valid spotlight predicate at all!!!",
        ])
        .output()
        .unwrap();
    let code = output.status.code().unwrap_or(-1);
    assert_eq!(
        code, 2,
        "invalid predicate should exit 2 (usage), got {}\nstderr: {}",
        code,
        String::from_utf8_lossy(&output.stderr),
    );
}

#[test]
fn items_search_timeout_sets_flag_without_nonzero_exit() {
    let dir = std::env::temp_dir().join("ray-fb-test-search-timeout");
    std::fs::create_dir_all(&dir).ok();

    let output = ray_fb()
        .args([
            "items",
            "search",
            "--only-in",
            dir.to_str().unwrap(),
            "--predicate",
            "kMDItemTextContent == '*nonexistent*'",
            "--timeout-ms",
            "1",
        ])
        .output()
        .unwrap();
    let code = output.status.code().unwrap_or(-1);
    assert_eq!(
        code, 0,
        "timeout should exit 0, got {}\nstderr: {}",
        code,
        String::from_utf8_lossy(&output.stderr),
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("search timeout should produce valid JSON: {e}\noutput: {stdout}");
    });
    let is_timed_out = parsed
        .get("isTimedOut")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    assert!(
        is_timed_out,
        "timed out search should have isTimedOut=true, got: {parsed}"
    );

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn items_list_mount_root_is_mount_root() {
    let dir = std::env::temp_dir().join("ray-fb-test-cli-mount");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();

    let dmg = dir.join("mntest.sparseimage");
    let mkfs = Command::new("hdiutil")
        .args([
            "create",
            "-size",
            "1m",
            "-fs",
            "APFS",
            "-type",
            "SPARSE",
            "-volname",
            "rayfbmounttest",
            dmg.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    if !mkfs.status.success() {
        eprintln!(
            "SKIP items_list_mount_root_is_mount_root: hdiutil create failed: {}",
            String::from_utf8_lossy(&mkfs.stderr)
        );
        let _ = std::fs::remove_dir_all(&dir);
        return;
    }

    let sparse_path = dir.join("mntest.sparseimage");
    let mount_point = format!("/Volumes/rayfbmounttest");
    let attach = Command::new("hdiutil")
        .args([
            "attach",
            "-nobrowse",
            sparse_path.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    if !attach.status.success() {
        eprintln!(
            "SKIP items_list_mount_root_is_mount_root: hdiutil attach failed: {}",
            String::from_utf8_lossy(&attach.stderr)
        );
        let _ = std::fs::remove_dir_all(&dir);
        return;
    }

    // Find where it actually mounted (hdiutil may choose a different name)
    let attach_stdout = String::from_utf8_lossy(&attach.stdout);
    let actual_mount = attach_stdout
        .lines()
        .find_map(|line| {
            let trimmed = line.trim();
            trimmed.strip_prefix("/Volumes/").map(|s| {
                let name = s.split_whitespace().next().unwrap_or(s);
                format!("/Volumes/{name}")
            })
        })
        .unwrap_or_else(|| mount_point.clone());

    // List /Volumes and find the mounted volume
    let output = ray_fb()
        .args([
            "items",
            "list",
            "--path",
            "/Volumes",
            "--sort",
            "name-asc",
            "--show-hidden",
            "false",
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("items list should produce valid JSON: {e}\noutput: {stdout}");
    });
    let items = parsed.as_array().expect("items list should return a JSON array");

    let vol_name = actual_mount
        .strip_prefix("/Volumes/")
        .unwrap_or("rayfbmounttest");
    let mount_entry = items.iter().find(|i| {
        i["name"]
            .as_str()
            .map(|n| n == vol_name)
            .unwrap_or(false)
    });

    if let Some(entry) = mount_entry {
        assert_eq!(
            entry["isMountRoot"].as_bool(),
            Some(true),
            "{vol_name} should have isMountRoot=true, got: {entry}"
        );
        assert_eq!(
            entry["isPackageLike"].as_bool(),
            Some(false),
            "{vol_name} should have isPackageLike=false, got: {entry}"
        );
    }

    let _ = Command::new("hdiutil")
        .args(["detach", &actual_mount, "-force"])
        .output();
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn items_hydrate_returns_items_in_input_order() {
    let dir = std::env::temp_dir().join("ray-fb-test-hydrate-order");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();

    let a = dir.join("alpha.txt");
    let b = dir.join("beta.txt");
    let c = dir.join("gamma.txt");
    std::fs::write(&a, "a").ok();
    std::fs::write(&b, "b").ok();
    std::fs::write(&c, "c").ok();

    let output = ray_fb()
        .args([
            "items",
            "hydrate",
            "--paths",
            c.to_str().unwrap(),
            a.to_str().unwrap(),
            b.to_str().unwrap(),
            "--show-hidden",
            "true",
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("items hydrate should produce valid JSON: {e}\noutput: {stdout}");
    });
    let items = parsed.as_array().expect("items hydrate should return a JSON array");
    assert_eq!(items.len(), 3, "expected 3 items, got {}", items.len());

    let names: Vec<&str> = items
        .iter()
        .map(|i| i["name"].as_str().unwrap_or(""))
        .collect();
    assert_eq!(names, vec!["gamma.txt", "alpha.txt", "beta.txt"],
        "items should appear in input order (gamma, alpha, beta)");

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn items_hydrate_skips_missing_paths() {
    let dir = std::env::temp_dir().join("ray-fb-test-hydrate-missing");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();

    let exists = dir.join("exists.txt");
    std::fs::write(&exists, "data").ok();
    let missing = dir.join("no_such_file.txt");

    let output = ray_fb()
        .args([
            "items",
            "hydrate",
            "--paths",
            missing.to_str().unwrap(),
            exists.to_str().unwrap(),
            "--show-hidden",
            "true",
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("items hydrate should produce valid JSON: {e}\noutput: {stdout}");
    });
    let items = parsed.as_array().expect("items hydrate should return a JSON array");
    assert_eq!(items.len(), 1, "expected 1 item (missing path skipped)");
    assert_eq!(items[0]["name"].as_str(), Some("exists.txt"));

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn items_hydrate_respects_show_hidden_false() {
    let dir = std::env::temp_dir().join("ray-fb-test-hydrate-hidden");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).ok();

    let visible = dir.join("visible.txt");
    let hidden = dir.join(".hidden.txt");
    std::fs::write(&visible, "v").ok();
    std::fs::write(&hidden, "h").ok();

    let output = ray_fb()
        .args([
            "items",
            "hydrate",
            "--paths",
            visible.to_str().unwrap(),
            hidden.to_str().unwrap(),
            "--show-hidden",
            "false",
        ])
        .output()
        .unwrap();
    assert_exit(0, &output);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).unwrap_or_else(|e| {
        panic!("items hydrate should produce valid JSON: {e}\noutput: {stdout}");
    });
    let items = parsed.as_array().expect("items hydrate should return a JSON array");
    assert_eq!(items.len(), 1, "expected 1 item (hidden file filtered)");
    assert_eq!(items[0]["name"].as_str(), Some("visible.txt"));

    let _ = std::fs::remove_dir_all(&dir);
}
