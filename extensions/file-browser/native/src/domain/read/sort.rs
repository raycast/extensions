//! Sorting logic for directory items using the canonical `SortMode`.
//!
//! All sorting is owned by Rust. The canonical `core::contract::SortMode` is
//! used exclusively — the legacy `metadata::item::SortMode` is not referenced.

use super::dto::Item;
use crate::core::contract::SortMode;
use crate::core::types::MdItemUserTag;
use std::cmp::Ordering;

/// Sort a slice of `Item` values in-place.
///
/// When `directories_first` is `true`, directories are grouped before files,
/// with each group sorted independently by `mode`.
pub fn sort_items(items: &mut [Item], mode: SortMode, directories_first: bool) {
    items.sort_by(|a, b| {
        if directories_first {
            let a_is_dir = a.typ == "directory";
            let b_is_dir = b.typ == "directory";

            match (a_is_dir, b_is_dir) {
                (true, false) => Ordering::Less,
                (false, true) => Ordering::Greater,
                _ => compare_items(a, b, mode),
            }
        } else {
            compare_items(a, b, mode)
        }
    });
}

fn compare_items(a: &Item, b: &Item, mode: SortMode) -> Ordering {
    match mode {
        SortMode::NameAsc => compare_strings(Some(&a.name), Some(&b.name)),
        SortMode::KindAsc => {
            compare_strings(a.md_attrs.kind.as_deref(), b.md_attrs.kind.as_deref())
        }
        SortMode::LastOpenedAsc => {
            compare_numbers_desc(a.md_attrs.last_used_date, b.md_attrs.last_used_date)
        }
        SortMode::AddedDesc => compare_numbers_desc(date_added_value(a), date_added_value(b)),
        SortMode::ModifiedAsc => compare_numbers_desc(
            a.md_attrs.content_modification_date,
            b.md_attrs.content_modification_date,
        ),
        SortMode::CreatedAsc => {
            compare_numbers(a.md_attrs.fs_creation_date, b.md_attrs.fs_creation_date)
        }
        SortMode::SizeAsc => a.size.cmp(&b.size),
        SortMode::TagsAsc => compare_strings(
            Some(&tags_sort_key(&a.md_attrs.user_tags)),
            Some(&tags_sort_key(&b.md_attrs.user_tags)),
        ),
    }
    .then_with(|| a.name.cmp(&b.name))
}

fn compare_strings(left: Option<&str>, right: Option<&str>) -> Ordering {
    match (left, right) {
        (Some(l), Some(r)) => l.to_lowercase().cmp(&r.to_lowercase()),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

fn compare_numbers(left: Option<u64>, right: Option<u64>) -> Ordering {
    match (left, right) {
        (Some(l), Some(r)) => l.cmp(&r),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

/// Descending comparison: `None` is sorted last (greatest), higher values first.
fn compare_numbers_desc(left: Option<u64>, right: Option<u64>) -> Ordering {
    match (left, right) {
        (Some(l), Some(r)) => r.cmp(&l),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

/// Compute the "date added" value for an item.
///
/// Uses the closest available file-system metadata date exposed in the DTO.
/// Returns `None` when the value is unavailable.
fn date_added_value(item: &Item) -> Option<u64> {
    item.md_attrs.fs_content_change_date
}

fn tags_sort_key(tags: &[MdItemUserTag]) -> String {
    if tags.is_empty() {
        return "\u{ffff}".to_string();
    }

    tags.iter()
        .map(|tag| tag.name.as_str())
        .collect::<Vec<&str>>()
        .join("\u{0}")
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::types::MdItemUserTag;
    use crate::domain::read::dto::{Item, MdItemAttrs};

    fn make_item(name: &str, typ: &str, attrs: MdItemAttrs, size: u64) -> Item {
        Item {
            name: name.to_string(),
            typ: typ.to_string(),
            path: format!("/test/{name}"),
            size,
            is_package_like: false,
            is_mount_root: false,
            md_attrs: attrs,
        }
    }

    fn make_attrs(
        fs_content_change_date: Option<u64>,
        last_used_date: Option<u64>,
        content_modification_date: Option<u64>,
        fs_creation_date: Option<u64>,
    ) -> MdItemAttrs {
        MdItemAttrs {
            fs_content_change_date,
            last_used_date,
            content_modification_date,
            fs_creation_date,
            ..MdItemAttrs::default()
        }
    }

    fn assert_order(items: &[Item], expected: &[&str]) {
        let actual = items.iter().map(|item| item.name.as_str()).collect::<Vec<_>>();
        assert_eq!(actual, expected);
    }

    #[test]
    fn name_asc_sorts_alphabetically() {
        let mut items = vec![
            make_item("charlie", "file", MdItemAttrs::default(), 0),
            make_item("alpha", "file", MdItemAttrs::default(), 0),
            make_item("bravo", "file", MdItemAttrs::default(), 0),
        ];
        sort_items(&mut items, SortMode::NameAsc, false);
        assert_eq!(items[0].name, "alpha");
        assert_eq!(items[1].name, "bravo");
        assert_eq!(items[2].name, "charlie");
    }

    #[test]
    fn directories_first_groups_dirs_before_files() {
        let mut items = vec![
            make_item("file.txt", "file", MdItemAttrs::default(), 0),
            make_item("folder", "directory", MdItemAttrs::default(), 0),
            make_item("another.txt", "file", MdItemAttrs::default(), 0),
        ];
        sort_items(&mut items, SortMode::NameAsc, true);
        assert_eq!(items[0].name, "folder");
        assert!(items[0].typ == "directory");
    }

    #[test]
    fn added_desc_sorts_newest_first_with_missing_last_and_name_tiebreakers() {
        let mut items = vec![
            make_item(
                "folder-missing",
                "directory",
                make_attrs(None, Some(500), Some(50), Some(900)),
                0,
            ),
            make_item(
                "folder-newest",
                "directory",
                make_attrs(Some(400), Some(100), Some(900), Some(50)),
                0,
            ),
            make_item(
                "folder-tie-b",
                "directory",
                make_attrs(Some(300), Some(300), Some(700), Some(150)),
                0,
            ),
            make_item(
                "folder-tie-a",
                "directory",
                make_attrs(Some(300), Some(200), Some(600), Some(250)),
                0,
            ),
            make_item(
                "folder-older",
                "directory",
                make_attrs(Some(100), Some(400), Some(800), Some(350)),
                0,
            ),
            make_item(
                "file-missing",
                "file",
                make_attrs(None, Some(450), Some(75), Some(875)),
                0,
            ),
            make_item(
                "file-newest",
                "file",
                make_attrs(Some(390), Some(150), Some(890), Some(60)),
                0,
            ),
            make_item(
                "file-tie-b",
                "file",
                make_attrs(Some(280), Some(350), Some(680), Some(160)),
                0,
            ),
            make_item(
                "file-tie-a",
                "file",
                make_attrs(Some(280), Some(250), Some(580), Some(260)),
                0,
            ),
            make_item(
                "file-older",
                "file",
                make_attrs(Some(90), Some(420), Some(780), Some(360)),
                0,
            ),
        ];
        sort_items(&mut items, SortMode::AddedDesc, true);
        assert_order(
            &items,
            &[
                "folder-newest",
                "folder-tie-a",
                "folder-tie-b",
                "folder-older",
                "folder-missing",
                "file-newest",
                "file-tie-a",
                "file-tie-b",
                "file-older",
                "file-missing",
            ],
        );
    }

    #[test]
    fn added_desc_uses_added_date_without_fallback() {
        let mut items = vec![
            make_item(
                "has_creation_only",
                "file",
                make_attrs(None, None, None, Some(500)),
                0,
            ),
            make_item(
                "has_added_date",
                "file",
                make_attrs(Some(100), None, None, None),
                0,
            ),
        ];
        sort_items(&mut items, SortMode::AddedDesc, false);
        assert_order(&items, &["has_added_date", "has_creation_only"]);
    }

    #[test]
    fn last_opened_asc_sorts_newest_first_with_missing_last() {
        let mut items = vec![
            make_item(
                "folder-missing",
                "directory",
                make_attrs(Some(999), None, Some(50), Some(10)),
                0,
            ),
            make_item(
                "folder-newest",
                "directory",
                make_attrs(Some(100), Some(400), Some(900), Some(20)),
                0,
            ),
            make_item(
                "folder-tie-b",
                "directory",
                make_attrs(Some(200), Some(300), Some(800), Some(30)),
                0,
            ),
            make_item(
                "folder-tie-a",
                "directory",
                make_attrs(Some(300), Some(300), Some(700), Some(40)),
                0,
            ),
            make_item(
                "file-missing",
                "file",
                make_attrs(Some(888), None, Some(60), Some(15)),
                0,
            ),
            make_item(
                "file-newest",
                "file",
                make_attrs(Some(110), Some(390), Some(910), Some(25)),
                0,
            ),
            make_item(
                "file-tie-b",
                "file",
                make_attrs(Some(210), Some(290), Some(810), Some(35)),
                0,
            ),
            make_item(
                "file-tie-a",
                "file",
                make_attrs(Some(310), Some(290), Some(710), Some(45)),
                0,
            ),
        ];
        sort_items(&mut items, SortMode::LastOpenedAsc, true);
        assert_order(
            &items,
            &[
                "folder-newest",
                "folder-tie-a",
                "folder-tie-b",
                "folder-missing",
                "file-newest",
                "file-tie-a",
                "file-tie-b",
                "file-missing",
            ],
        );
    }

    #[test]
    fn modified_asc_sorts_newest_first_with_missing_last() {
        let mut items = vec![
            make_item(
                "folder-missing",
                "directory",
                make_attrs(Some(999), Some(50), None, Some(10)),
                0,
            ),
            make_item(
                "folder-newest",
                "directory",
                make_attrs(Some(100), Some(400), Some(900), Some(20)),
                0,
            ),
            make_item(
                "folder-tie-b",
                "directory",
                make_attrs(Some(200), Some(300), Some(800), Some(30)),
                0,
            ),
            make_item(
                "folder-tie-a",
                "directory",
                make_attrs(Some(300), Some(200), Some(800), Some(40)),
                0,
            ),
            make_item(
                "folder-older",
                "directory",
                make_attrs(Some(400), Some(100), Some(600), Some(50)),
                0,
            ),
            make_item(
                "file-missing",
                "file",
                make_attrs(Some(888), Some(60), None, Some(15)),
                0,
            ),
            make_item(
                "file-newest",
                "file",
                make_attrs(Some(110), Some(390), Some(910), Some(25)),
                0,
            ),
            make_item(
                "file-tie-b",
                "file",
                make_attrs(Some(210), Some(290), Some(810), Some(35)),
                0,
            ),
            make_item(
                "file-tie-a",
                "file",
                make_attrs(Some(310), Some(190), Some(810), Some(45)),
                0,
            ),
            make_item(
                "file-older",
                "file",
                make_attrs(Some(410), Some(100), Some(610), Some(55)),
                0,
            ),
        ];
        sort_items(&mut items, SortMode::ModifiedAsc, true);
        assert_order(
            &items,
            &[
                "folder-newest",
                "folder-tie-a",
                "folder-tie-b",
                "folder-older",
                "folder-missing",
                "file-newest",
                "file-tie-a",
                "file-tie-b",
                "file-older",
                "file-missing",
            ],
        );
    }

    #[test]
    fn created_asc_sorts_oldest_first_with_missing_last() {
        let mut items = vec![
            make_item(
                "folder-missing",
                "directory",
                make_attrs(Some(999), Some(50), Some(10), None),
                0,
            ),
            make_item(
                "folder-newest",
                "directory",
                make_attrs(Some(100), Some(400), Some(900), Some(220)),
                0,
            ),
            make_item(
                "folder-tie-b",
                "directory",
                make_attrs(Some(200), Some(300), Some(800), Some(150)),
                0,
            ),
            make_item(
                "folder-tie-a",
                "directory",
                make_attrs(Some(300), Some(200), Some(700), Some(150)),
                0,
            ),
            make_item(
                "folder-older",
                "directory",
                make_attrs(Some(400), Some(100), Some(600), Some(90)),
                0,
            ),
            make_item(
                "file-missing",
                "file",
                make_attrs(Some(888), Some(60), Some(15), None),
                0,
            ),
            make_item(
                "file-newest",
                "file",
                make_attrs(Some(110), Some(390), Some(910), Some(230)),
                0,
            ),
            make_item(
                "file-tie-b",
                "file",
                make_attrs(Some(210), Some(290), Some(810), Some(160)),
                0,
            ),
            make_item(
                "file-tie-a",
                "file",
                make_attrs(Some(310), Some(190), Some(710), Some(160)),
                0,
            ),
            make_item(
                "file-older",
                "file",
                make_attrs(Some(410), Some(100), Some(610), Some(80)),
                0,
            ),
        ];
        sort_items(&mut items, SortMode::CreatedAsc, true);
        assert_order(
            &items,
            &[
                "folder-older",
                "folder-tie-a",
                "folder-tie-b",
                "folder-newest",
                "folder-missing",
                "file-older",
                "file-tie-a",
                "file-tie-b",
                "file-newest",
                "file-missing",
            ],
        );
    }

    #[test]
    fn kind_asc_sorts_case_insensitively() {
        let mut items = vec![
            make_item("beta", "file", MdItemAttrs::default(), 0),
            make_item("alpha", "directory", MdItemAttrs::default(), 0),
            make_item("gamma", "symlink", MdItemAttrs::default(), 0),
        ];
        sort_items(&mut items, SortMode::KindAsc, false);
        assert_order(&items, &["alpha", "beta", "gamma"]);
    }

    #[test]
    fn tags_asc_sorts_missing_tags_last() {
        let mut items = vec![
            make_item(
                "zeta",
                "file",
                MdItemAttrs {
                    user_tags: vec![MdItemUserTag::name_only("Zebra")],
                    ..MdItemAttrs::default()
                },
                0,
            ),
            make_item(
                "alpha",
                "file",
                MdItemAttrs {
                    user_tags: vec![MdItemUserTag::name_only("Alpha")],
                    ..MdItemAttrs::default()
                },
                0,
            ),
            make_item("untagged", "file", MdItemAttrs::default(), 0),
        ];
        sort_items(&mut items, SortMode::TagsAsc, false);
        assert_order(&items, &["alpha", "zeta", "untagged"]);
    }

    #[test]
    fn size_asc_sorts_smallest_first() {
        let mut items = vec![
            make_item("big", "file", MdItemAttrs::default(), 300),
            make_item("small", "file", MdItemAttrs::default(), 10),
            make_item("medium", "file", MdItemAttrs::default(), 100),
        ];
        sort_items(&mut items, SortMode::SizeAsc, false);
        assert_eq!(items[0].name, "small");
        assert_eq!(items[1].name, "medium");
        assert_eq!(items[2].name, "big");
    }

    #[test]
    fn sort_stable_by_name_on_tie() {
        let mut items = vec![
            make_item("beta", "file", MdItemAttrs::default(), 100),
            make_item("alpha", "file", MdItemAttrs::default(), 100),
        ];
        sort_items(&mut items, SortMode::SizeAsc, false);
        // Same size → tie-break by name
        assert_eq!(items[0].name, "alpha");
        assert_eq!(items[1].name, "beta");
    }
}
