//! Error model and exit-code policy for `ray-fb`.
//!
//! # Exit Codes
//!
//! | Constant       | Value | Meaning                          |
//! |----------------|-------|----------------------------------|
//! | EXIT_SUCCESS   | 0     | Success                          |
//! | EXIT_INTERNAL  | 1     | Internal / unexpected error      |
//! | EXIT_USAGE     | 2     | Argument / validation error      |
//! | EXIT_NOT_FOUND | 3     | Target path not found            |
//! | EXIT_PERMISSION| 4     | Permissions or OS tool failure   |
//! | EXIT_METADATA  | 5     | Metadata unavailable/unsupported |

use std::fmt;
use std::io;
use std::path::PathBuf;

// ---------------------------------------------------------------------------
// Exit-code constants
// ---------------------------------------------------------------------------

/// Operation completed successfully.
pub const EXIT_SUCCESS: i32 = 0;
/// Internal / unexpected error (catch-all).
pub const EXIT_INTERNAL: i32 = 1;
/// Argument parsing or validation error.
pub const EXIT_USAGE: i32 = 2;
/// Target path or item not found.
pub const EXIT_NOT_FOUND: i32 = 3;
/// Permissions or OS tool failure (e.g. `chflags`, `osascript`).
pub const EXIT_PERMISSION: i32 = 4;
/// Metadata query unavailable or returned unsupported data.
pub const EXIT_METADATA: i32 = 5;

// ---------------------------------------------------------------------------
// RayFbError
// ---------------------------------------------------------------------------

/// Unified error type for all `ray-fb` operations.
#[derive(Debug)]
pub enum RayFbError {
    /// An argument was missing, malformed, or semantically invalid.
    Usage(String),
    /// The requested file, directory, or tag was not found.
    NotFound { path: Option<PathBuf>, detail: String },
    /// A permissions failure or external OS tool returned non-zero.
    Permission(String),
    /// Spotlight / metadata query failed or returned unsupported data.
    Metadata(String),
    /// An unexpected internal error (I/O, deserialization, etc.).
    Internal { source: Box<dyn std::error::Error + Send + Sync>, detail: Option<String> },
}

impl RayFbError {
    /// Map this error to its canonical exit code.
    pub fn exit_code(&self) -> i32 {
        match self {
            Self::Usage(_) => EXIT_USAGE,
            Self::NotFound { .. } => EXIT_NOT_FOUND,
            Self::Permission(_) => EXIT_PERMISSION,
            Self::Metadata(_) => EXIT_METADATA,
            Self::Internal { .. } => EXIT_INTERNAL,
        }
    }
}

impl fmt::Display for RayFbError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Usage(msg) => write!(f, "usage error: {msg}"),
            Self::NotFound { path, detail } => {
                if let Some(p) = path {
                    write!(f, "not found: {}: {detail}", p.display())
                } else {
                    write!(f, "not found: {detail}")
                }
            }
            Self::Permission(msg) => write!(f, "permission error: {msg}"),
            Self::Metadata(msg) => write!(f, "metadata error: {msg}"),
            Self::Internal { source, detail } => {
                if let Some(d) = detail {
                    write!(f, "internal error: {d}: {source}")
                } else {
                    write!(f, "internal error: {source}")
                }
            }
        }
    }
}

impl std::error::Error for RayFbError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Internal { source, .. } => Some(source.as_ref()),
            _ => None,
        }
    }
}

// ---------------------------------------------------------------------------
// From impls — ergonomic construction from common error types
// ---------------------------------------------------------------------------

impl From<io::Error> for RayFbError {
    fn from(err: io::Error) -> Self {
        match err.kind() {
            io::ErrorKind::NotFound => Self::NotFound {
                path: None,
                detail: err.to_string(),
            },
            io::ErrorKind::PermissionDenied => Self::Permission(err.to_string()),
            _ => Self::Internal {
                source: Box::new(err),
                detail: None,
            },
        }
    }
}

impl From<String> for RayFbError {
    fn from(msg: String) -> Self {
        Self::Internal {
            source: msg.into(),
            detail: None,
        }
    }
}

impl From<&str> for RayFbError {
    fn from(msg: &str) -> Self {
        Self::Internal {
            source: msg.to_string().into(),
            detail: None,
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exit_codes_are_distinct() {
        let codes = [EXIT_SUCCESS, EXIT_INTERNAL, EXIT_USAGE, EXIT_NOT_FOUND, EXIT_PERMISSION, EXIT_METADATA];
        let mut sorted = codes.to_vec();
        sorted.sort();
        sorted.dedup();
        assert_eq!(sorted.len(), codes.len(), "exit codes must be unique");
    }

    #[test]
    fn usage_maps_to_exit_2() {
        let err = RayFbError::Usage("bad arg".into());
        assert_eq!(err.exit_code(), EXIT_USAGE);
    }

    #[test]
    fn not_found_maps_to_exit_3() {
        let err = RayFbError::NotFound { path: None, detail: "gone".into() };
        assert_eq!(err.exit_code(), EXIT_NOT_FOUND);
    }

    #[test]
    fn permission_maps_to_exit_4() {
        let err = RayFbError::Permission("denied".into());
        assert_eq!(err.exit_code(), EXIT_PERMISSION);
    }

    #[test]
    fn metadata_maps_to_exit_5() {
        let err = RayFbError::Metadata("unsupported".into());
        assert_eq!(err.exit_code(), EXIT_METADATA);
    }

    #[test]
    fn io_not_found_maps_to_exit_3() {
        let io_err = io::Error::new(io::ErrorKind::NotFound, "nope");
        let err: RayFbError = io_err.into();
        assert_eq!(err.exit_code(), EXIT_NOT_FOUND);
    }

    #[test]
    fn io_permission_denied_maps_to_exit_4() {
        let io_err = io::Error::new(io::ErrorKind::PermissionDenied, "nope");
        let err: RayFbError = io_err.into();
        assert_eq!(err.exit_code(), EXIT_PERMISSION);
    }

    #[test]
    fn io_other_maps_to_exit_1() {
        let io_err = io::Error::new(io::ErrorKind::BrokenPipe, "pipe gone");
        let err: RayFbError = io_err.into();
        assert_eq!(err.exit_code(), EXIT_INTERNAL);
    }

    #[test]
    fn display_includes_detail() {
        let err = RayFbError::Usage("missing --path".into());
        assert!(err.to_string().contains("missing --path"));
    }
}
