use crate::domain::write::applescript;
use std::error::Error;
use std::path::Path;

/// Toggle the Finder "Stationery pad" attribute via AppleScript.
pub fn set_stationery_pad(path: &Path, stationery: bool) -> Result<(), Box<dyn Error>> {
    let (posix_line, file_line) = applescript::finder_preamble(path);
    let mut script_lines = vec![posix_line, file_line];
    script_lines.push(format!(
        "tell application \"Finder\" to set stationery of theFile to {}",
        if stationery { "true" } else { "false" }
    ));
    applescript::run_osascript(&script_lines)
}
