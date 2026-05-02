use crate::domain::write::applescript;
use base64::Engine as _;
use std::error::Error;
use std::path::Path;

/// Set Finder comment via AppleScript. Encodes the comment via base64 to avoid quoting issues.
pub fn set_finder_comment(path: &Path, comment: &str) -> Result<(), Box<dyn Error>> {
    let b64 = base64::engine::general_purpose::STANDARD.encode(comment.as_bytes());
    let (posix_line, file_line) = applescript::finder_preamble(path);

    let mut script_lines = vec![posix_line, format!("set b64 to \"{}\"", b64)];
    script_lines.push(
        "set decoded to do shell script \"echo \" & quoted form of b64 & \" | base64 -D\""
            .to_string(),
    );
    script_lines.push(file_line);
    script_lines.push("tell application \"Finder\" to set comment of theFile to decoded".to_string());

    applescript::run_osascript(&script_lines)
}
