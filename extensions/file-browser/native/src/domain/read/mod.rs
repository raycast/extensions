pub mod by_tag;
pub mod dto;
pub mod mditem;
pub mod query;
pub mod scan;
pub mod sort;
pub mod thumbnail;

pub use by_tag::read_items_by_tag;
pub use dto::{hydrate_items, read_dir_items, Item, MdItemAttrs, ReadDirOptions};
pub use thumbnail::generate_thumbnail;

use crate::core::error::RayFbError;
use std::path::Path;
use std::process::Command;
use std::env;
use std::sync::mpsc;
use std::time::{Duration, Instant};
use std::thread;

pub fn spotlight_search(
    scope: &Path,
    predicate: &str,
    max_results: Option<usize>,
    timeout_ms: Option<u64>,
) -> Result<(Vec<String>, bool, bool), RayFbError> {
    let scope_str = scope.to_string_lossy().to_string();
    let predicate_str = predicate.to_string();
    let debug_enabled = env::var("VOYAGER_SEARCH_DEBUG").map(|v| v == "1").unwrap_or(false);

    if predicate_str.trim().is_empty() {
        return Err(RayFbError::Usage("predicate cannot be empty".to_string()));
    }

    let has_spotlight_attr = predicate_str.contains("kMDItem")
        || predicate_str.contains("kMDLabel")
        || predicate_str.contains("kMDQuery")
        || predicate_str.contains("kMF")
        || predicate_str.contains("==")
        || predicate_str.contains("!=")
        || predicate_str.contains("LIKE")
        || predicate_str.contains("MATCHES")
        || predicate_str.contains("CONTAINS")
        || predicate_str.contains("BEGINSWITH")
        || predicate_str.contains("ENDSWITH");
    if !has_spotlight_attr {
        return Err(RayFbError::Usage(
            "predicate does not appear to be a valid Spotlight query (missing operators or attributes)".to_string(),
        ));
    }

    let (tx, rx) = mpsc::channel();
    let start = Instant::now();

    thread::spawn(move || {
        let mut cmd = Command::new("/usr/bin/mdfind");
        cmd.arg("-onlyin").arg(&scope_str);
        cmd.arg(&predicate_str);
        let mut debug_args = vec!["-onlyin".to_string(), scope_str.clone(), predicate_str.clone()];

        if let Some(n) = max_results {
            let limit_arg = format!("-limit={}", n);
            cmd.arg(&limit_arg);
            debug_args.push(limit_arg);
        }

        if debug_enabled {
            let debug_command = [vec!["/usr/bin/mdfind".to_string()], debug_args].concat().join(" ");
            eprintln!("[search-debug] mdfind {}", debug_command);
        }

        let output = cmd.output();

        match output {
            Ok(out) => {
                if out.status.success() {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    let paths: Vec<String> = stdout
                        .lines()
                        .filter(|l| !l.is_empty())
                        .map(|s| s.to_string())
                        .collect();
                    let _ = tx.send(Ok(paths));
                } else {
                    let stderr = String::from_utf8_lossy(&out.stderr);
                    let _ = tx.send(Err(format!("mdfind failed: {}", stderr)));
                }
            }
            Err(e) => {
                let _ = tx.send(Err(format!("failed to execute mdfind: {}", e)));
            }
        }
    });

    let result = if let Some(ms) = timeout_ms {
        match rx.recv_timeout(Duration::from_millis(ms)) {
            Ok(r) => r,
            Err(_) => {
                let elapsed = start.elapsed().as_millis() as u64;
                if elapsed >= ms {
                    return Ok((Vec::new(), false, true));
                }
                match rx.recv_timeout(Duration::from_millis(5000)) {
                    Ok(r) => r,
                    Err(_) => return Ok((Vec::new(), false, true)),
                }
            }
        }
    } else {
        rx.recv().map_err(|_| "search thread failed")?
    };

    match result {
        Ok(paths) => {
            let is_truncated = max_results.map(|m| paths.len() >= m).unwrap_or(false);
            Ok((paths, is_truncated, false))
        }
        Err(msg) => {
            if msg.contains("Invalid query") || msg.contains("bad query") || msg.contains("parse error") || msg.contains("syntax error") || msg.contains("Failed to create query") {
                Err(RayFbError::Usage(msg))
            } else {
                Err(RayFbError::Metadata(msg))
            }
        }
    }
}
