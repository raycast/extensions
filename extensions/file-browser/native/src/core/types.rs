//! Shared value types and serialization helpers for `ray-fb`.
//!
//! These types are THE canonical definitions. All other modules (metadata,
//! fileops, domain) should re-export or reference these rather than defining
//! their own.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// MdItemUserTag — a Finder tag with optional color
// ---------------------------------------------------------------------------

/// A Finder user tag: a name plus an optional color index (0–7).
///
/// Serialized as camelCase JSON to match the TypeScript contract:
/// ```json
/// { "name": "Red", "colorIndex": 0 }
/// { "name": "Important", "colorIndex": null }
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MdItemUserTag {
    pub name: String,
    pub color_index: Option<u8>,
}

impl MdItemUserTag {
    /// Create a tag with no colour information.
    pub fn name_only(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            color_index: None,
        }
    }

    /// Parse a raw Spotlight tag string.
    ///
    /// Spotlight stores tags as `"Name\n<number>"` where the optional trailing
    /// number is the colour index.
    pub fn from_raw(raw: impl AsRef<str>) -> Self {
        let raw = raw.as_ref();
        let parts: Vec<&str> = raw.split('\n').collect();
        let name = parts.first().unwrap().trim().to_string();
        let color_index = if parts.len() > 1 {
            parts.last().and_then(|s| s.trim().parse::<u8>().ok())
        } else {
            None
        };

        Self { name, color_index }
    }
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/// Write a JSON value to stdout, followed by a newline.
///
/// This is the standard output convention for all `ray-fb` commands that
/// return structured data.
pub fn write_json<T: Serialize>(value: &T) -> Result<(), String> {
    serde_json::to_string(value)
        .map_err(|e| format!("JSON serialization failed: {e}"))
        .map(|json| println!("{json}"))
}

/// Write a plain string to stdout, followed by a newline.
///
/// Used for commands like `item locked get` that return bare `true`/`false`
/// and `item rename` that returns a path string.
pub fn write_plain(value: impl std::fmt::Display) {
    println!("{value}");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tag_serializes_camel_case() {
        let tag = MdItemUserTag {
            name: "Red".into(),
            color_index: Some(0),
        };
        let json = serde_json::to_string(&tag).unwrap();
        assert!(
            json.contains("\"colorIndex\""),
            "expected camelCase, got: {json}"
        );
        assert!(
            json.contains("\"name\""),
            "expected name field, got: {json}"
        );
    }

    #[test]
    fn tag_null_color_index() {
        let tag = MdItemUserTag {
            name: "Important".into(),
            color_index: None,
        };
        let json = serde_json::to_string(&tag).unwrap();
        assert!(
            json.contains("null"),
            "expected null colorIndex, got: {json}"
        );
    }

    #[test]
    fn tag_name_only_constructor() {
        let tag = MdItemUserTag::name_only("Test");
        assert_eq!(tag.name, "Test");
        assert_eq!(tag.color_index, None);
    }

    #[test]
    fn tag_from_raw_with_color() {
        let tag = MdItemUserTag::from_raw("Red\n0");
        assert_eq!(tag.name, "Red");
        assert_eq!(tag.color_index, Some(0));
    }

    #[test]
    fn tag_from_raw_without_color() {
        let tag = MdItemUserTag::from_raw("Important");
        assert_eq!(tag.name, "Important");
        assert_eq!(tag.color_index, None);
    }

    #[test]
    fn tag_from_raw_trims_whitespace() {
        let tag = MdItemUserTag::from_raw("  Blue  \n  2  ");
        assert_eq!(tag.name, "Blue");
        assert_eq!(tag.color_index, Some(2));
    }

    #[test]
    fn tag_round_trip_json() {
        let tag = MdItemUserTag {
            name: "Project".into(),
            color_index: Some(5),
        };
        let json = serde_json::to_string(&tag).unwrap();
        let back: MdItemUserTag = serde_json::from_str(&json).unwrap();
        assert_eq!(tag, back);
    }
}
