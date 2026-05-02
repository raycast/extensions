use std::error::Error;
use std::path::Path;
use std::process::Command;

pub fn escape_for_applescript(raw: &str) -> String {
    raw.replace('\\', "\\\\").replace('"', "\\\"")
}

pub fn finder_preamble(path: &Path) -> (String, String) {
    let escaped_path = escape_for_applescript(&path.to_string_lossy());
    (
        format!("set posixPath to \"{}\"", escaped_path),
        "set theFile to POSIX file posixPath as alias".to_string(),
    )
}

pub fn run_osascript(lines: &[String]) -> Result<(), Box<dyn Error>> {
    let mut cmd = Command::new("osascript");
    for line in lines {
        cmd.arg("-e").arg(line);
    }
    let output = cmd.output()?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("osascript failed: {}", stderr.trim()).into());
    }
    Ok(())
}
