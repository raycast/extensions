//! Spotlight/CoreFoundation metadata fetching.
//!
//! Delegates to the shared `mditem` module for MDItem attribute queries.

use super::dto::MdItemAttrs;
use std::{error::Error, path::Path};

/// Fetch Spotlight metadata attributes for the file at `path`.
///
/// Returns a default `MdItemAttrs` if the MDItem cannot be created (e.g. the
/// path does not exist in the Spotlight index).
pub fn fetch_attrs(path: &Path) -> Result<MdItemAttrs, Box<dyn Error>> {
    super::mditem::fetch_mditem_attrs(path)
}
