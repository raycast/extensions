//! Shared Finder-tag primitive helpers.
//!
//! Thin, pure functions used by both the read and write sides for
//! consistent tag-name handling.

/// Trim whitespace and return the display-ready form.
///
/// Returns `None` when the input is empty (or only whitespace) after trimming.
/// Case is preserved — this is the name shown to the user.
pub fn normalise_tag_display_name(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Trim + lowercase a raw tag string to produce a canonical lookup key.
///
/// Returns `None` when the input is empty (or only whitespace) after trimming.
pub fn tag_key(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_lowercase())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_name_trims_whitespace() {
        assert_eq!(normalise_tag_display_name("  Blue  "), Some("Blue".to_string()));
    }

    #[test]
    fn display_name_preserves_hyphen_and_case() {
        assert_eq!(normalise_tag_display_name("Red-Blue"), Some("Red-Blue".to_string()));
    }

    #[test]
    fn display_name_empty_is_none() {
        assert_eq!(normalise_tag_display_name(""), None);
    }

    #[test]
    fn display_name_whitespace_only_is_none() {
        assert_eq!(normalise_tag_display_name("   "), None);
    }

    #[test]
    fn tag_key_trims_and_lowercases() {
        assert_eq!(tag_key("  Blue  "), Some("blue".to_string()));
    }

    #[test]
    fn tag_key_uppercase_to_lower() {
        assert_eq!(tag_key("RED"), Some("red".to_string()));
    }

    #[test]
    fn tag_key_empty_is_none() {
        assert_eq!(tag_key(""), None);
    }

    #[test]
    fn tag_key_whitespace_only_is_none() {
        assert_eq!(tag_key("   "), None);
    }

    #[test]
    fn cross_domain_key_collision_blue_vs_blue() {
        assert_eq!(tag_key("Blue"), Some("blue".to_string()));
        assert_eq!(tag_key("blue"), Some("blue".to_string()));
        assert_eq!(normalise_tag_display_name("Blue"), Some("Blue".to_string()));
        assert_eq!(normalise_tag_display_name("blue"), Some("blue".to_string()));
    }

    #[test]
    fn cross_domain_unknown_tag_key() {
        assert_eq!(tag_key("Custom"), Some("custom".to_string()));
        assert_eq!(normalise_tag_display_name("Custom"), Some("Custom".to_string()));
    }

    #[test]
    fn cross_domain_rejects_empty_consistently() {
        assert_eq!(tag_key(""), None);
        assert_eq!(normalise_tag_display_name(""), None);
        assert_eq!(tag_key("   "), None);
        assert_eq!(normalise_tag_display_name("   "), None);
    }
}
