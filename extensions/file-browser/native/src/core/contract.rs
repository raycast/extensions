//! Canonical CLI contract for `ray-fb`.
//!
//! # Command Surface
//!
//! ```text
//! ray-fb items list --path <dir> --sort <mode> --show-hidden <true|false>
//! ray-fb item rename --path <path> --to <new-name>
//! ray-fb item comment set --path <path> --value <comment>
//! ray-fb item locked get --path <path>
//! ray-fb item locked set --path <path> --value <true|false>
//! ray-fb item stationery set --path <path> --value <true|false>
//! ray-fb item tags replace --path <path> --values <tag>...
//! ray-fb tags list
//! ```
//!
//! # Output Semantics
//!
//! - `items list` — JSON array matching the `MdItem[]` shape consumed by `use-mditems.ts`
//! - `tags list` — JSON array of `MdItemUserTag` objects
//! - `item locked get` — literal `true` or `false` on stdout
//! - `item rename` — the new absolute path as a string
//! - All mutation setters — empty stdout on success
//!
//! # Exit Codes
//!
//! | Code | Meaning                          |
//! |------|----------------------------------|
//! | 0    | Success                          |
//! | 1    | Internal error                   |
//! | 2    | Argument / validation error      |
//! | 3    | Target not found                 |
//! | 4    | Permissions or OS tool failure   |
//! | 5    | Metadata unavailable/unsupported |

use serde::{Deserialize, Serialize};
use std::fmt;

// ---------------------------------------------------------------------------
// SortMode — canonical sort modes matching the TypeScript contract
// ---------------------------------------------------------------------------

/// Canonical sort modes for `items list`.
///
/// The string representation (via [`SortMode::from_str`] / [`SortMode::as_str`])
/// matches exactly the values sent by the TypeScript layer:
///
/// | Rust variant  | String value            |
/// |---------------|-------------------------|
/// | NameAsc       | "name-asc"              |
/// | KindAsc       | "kind-asc"              |
/// | LastOpenedAsc | "date-last-opened-asc"  |
/// | AddedDesc     | "date-added-desc"       |
/// | ModifiedAsc   | "date-modified-asc"     |
/// | CreatedAsc    | "date-created-asc"      |
/// | SizeAsc       | "size-asc"              |
/// | TagsAsc       | "tags-asc"              |
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortMode {
    NameAsc,
    KindAsc,
    LastOpenedAsc,
    /// Most-recently-added first (the default "Date Added" sort in the TS layer).
    AddedDesc,
    ModifiedAsc,
    CreatedAsc,
    SizeAsc,
    TagsAsc,
}

impl SortMode {
    /// Parse a sort-mode string as sent by TypeScript.
    ///
    /// Returns `None` for unrecognised values.
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "name-asc" => Some(Self::NameAsc),
            "kind-asc" => Some(Self::KindAsc),
            "date-last-opened-asc" => Some(Self::LastOpenedAsc),
            "date-added-desc" => Some(Self::AddedDesc),
            "date-modified-asc" => Some(Self::ModifiedAsc),
            "date-created-asc" => Some(Self::CreatedAsc),
            "size-asc" => Some(Self::SizeAsc),
            "tags-asc" => Some(Self::TagsAsc),
            _ => None,
        }
    }

    /// Return the canonical CLI string for this variant.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::NameAsc => "name-asc",
            Self::KindAsc => "kind-asc",
            Self::LastOpenedAsc => "date-last-opened-asc",
            Self::AddedDesc => "date-added-desc",
            Self::ModifiedAsc => "date-modified-asc",
            Self::CreatedAsc => "date-created-asc",
            Self::SizeAsc => "size-asc",
            Self::TagsAsc => "tags-asc",
        }
    }

    /// All known variants in their canonical order.
    pub fn all() -> &'static [SortMode] {
        &[
            SortMode::NameAsc,
            SortMode::KindAsc,
            SortMode::LastOpenedAsc,
            SortMode::AddedDesc,
            SortMode::ModifiedAsc,
            SortMode::CreatedAsc,
            SortMode::SizeAsc,
            SortMode::TagsAsc,
        ]
    }
}

impl Default for SortMode {
    fn default() -> Self {
        Self::NameAsc
    }
}

impl fmt::Display for SortMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

// ---------------------------------------------------------------------------
// ItemType — file-system entry type
// ---------------------------------------------------------------------------

/// File-system entry type reported in the `type` field of `MdItem`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ItemType {
    Directory,
    File,
    Symlink,
}

impl ItemType {
    /// Return the JSON string value used in the `type` field.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Directory => "directory",
            Self::File => "file",
            Self::Symlink => "symlink",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "directory" => Some(Self::Directory),
            "file" => Some(Self::File),
            "symlink" => Some(Self::Symlink),
            _ => None,
        }
    }
}

impl fmt::Display for ItemType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sort_mode_round_trip() {
        for mode in SortMode::all() {
            let s = mode.as_str();
            assert_eq!(SortMode::from_str(s), Some(*mode), "round-trip for {:?}", mode);
        }
    }

    #[test]
    fn sort_mode_unknown_returns_none() {
        assert_eq!(SortMode::from_str("unknown"), None);
        assert_eq!(SortMode::from_str(""), None);
    }

    #[test]
    fn sort_mode_default_is_name_asc() {
        assert_eq!(SortMode::default(), SortMode::NameAsc);
    }

    #[test]
    fn date_added_desc_parses_from_ts_value() {
        assert_eq!(
            SortMode::from_str("date-added-desc"),
            Some(SortMode::AddedDesc)
        );
    }

    #[test]
    fn item_type_round_trip() {
        for val in &["directory", "file", "symlink"] {
            let t = ItemType::from_str(val).unwrap();
            assert_eq!(t.as_str(), *val);
        }
    }

    #[test]
    fn item_type_unknown_returns_none() {
        assert_eq!(ItemType::from_str("other"), None);
    }

    #[test]
    fn sort_mode_display_matches_as_str() {
        for mode in SortMode::all() {
            assert_eq!(format!("{}", mode), mode.as_str());
        }
    }
}
