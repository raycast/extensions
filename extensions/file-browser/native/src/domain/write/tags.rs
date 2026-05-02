use crate::core::finder_tags::{normalise_tag_display_name, tag_key};
use crate::core::types::MdItemUserTag;
use std::collections::BTreeMap;
use std::error::Error;
use std::io::Read;
use std::path::Path;

// Apple's fixed Finder tag color-index contract for fallback writes when a tag
// is not present in Finder's registered catalog. Do not reorder these values.
const DEFAULT_FINDER_TAG_COLORS: &[(&str, u8)] = &[
    ("Red", 1),
    ("Orange", 2),
    ("Yellow", 3),
    ("Green", 4),
    ("Blue", 5),
    ("Purple", 6),
    ("Gray", 7),
];

pub fn set_finder_tags(path: &Path, tags: &[String]) -> Result<(), Box<dyn Error>> {
    let registered_tags = list_finder_tags().unwrap_or_default();
    let color_map = build_color_map(&registered_tags);
    let display_map = build_display_map(&registered_tags);
    let entries = build_tag_entries(tags, &color_map, &display_map)?;

    let mut buf = Vec::new();
    let array_value = plist::Value::Array(entries);
    array_value.to_writer_binary(&mut buf)?;

    let hex: String = buf.iter().map(|b| format!("{:02x}", b)).collect();

    let output = std::process::Command::new("xattr")
        .arg("-wx")
        .arg("com.apple.metadata:_kMDItemUserTags")
        .arg(&hex)
        .arg("--")
        .arg(path)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("xattr failed: {}", stderr.trim()).into());
    }

    Ok(())
}

fn build_color_map(registered_tags: &[MdItemUserTag]) -> BTreeMap<String, u8> {
    let mut color_map: BTreeMap<String, u8> = BTreeMap::new();
    for rt in registered_tags {
        if let (Some(key), Some(color_index)) = (tag_key(&rt.name), rt.color_index) {
            color_map.entry(key).or_insert(color_index);
        }
    }
    for &(name, idx) in DEFAULT_FINDER_TAG_COLORS {
        if let Some(key) = tag_key(name) {
            color_map.entry(key).or_insert(idx);
        }
    }
    color_map
}

fn build_tag_entries(
    tags: &[String],
    color_map: &BTreeMap<String, u8>,
    display_map: &BTreeMap<String, String>,
) -> Result<Vec<plist::Value>, Box<dyn Error>> {
    let mut seen_keys: BTreeMap<String, ()> = BTreeMap::new();
    let mut entries: Vec<plist::Value> = Vec::new();

    for tag in tags {
        let Some(display) = normalise_tag_display_name(tag) else {
            continue;
        };
        if display.contains('\n') || display.contains('\r') {
            return Err("tag name cannot contain newlines".into());
        }
        let key = tag_key(&display).unwrap_or_else(|| display.to_lowercase());

        // Deduplicate by key: first occurrence wins
        if seen_keys.contains_key(&key) {
            continue;
        }
        seen_keys.insert(key.clone(), ());

        // Use catalog spelling when catalog match exists, otherwise trimmed input
        let write_name = display_map.get(&key).map(|s| s.as_str()).unwrap_or(&display);
        let color_index = color_map.get(&key).copied().unwrap_or(0);
        entries.push(plist::Value::String(format!("{}\n{}", write_name, color_index)));
    }
    Ok(entries)
}

fn build_display_map(registered_tags: &[MdItemUserTag]) -> BTreeMap<String, String> {
    let mut display_map: BTreeMap<String, String> = BTreeMap::new();
    for rt in registered_tags {
        if let Some(key) = tag_key(&rt.name) {
            display_map.entry(key).or_insert_with(|| rt.name.clone());
        }
    }
    display_map
}

pub fn list_finder_tags() -> Result<Vec<MdItemUserTag>, Box<dyn Error>> {
    let home = std::env::var("HOME")?;
    let home = Path::new(&home);

    for candidate in finder_plist_candidates(home) {
        if let Some(tags) = load_finder_tags_from_plist(&candidate)? {
            let mut seen: BTreeMap<String, MdItemUserTag> = BTreeMap::new();
            for (name, color_index) in tags {
                let Some(display) = normalise_tag_display_name(&name) else {
                    continue;
                };
                let key = tag_key(&display).unwrap();
                let entry = seen.entry(key).or_insert_with(|| MdItemUserTag {
                    name: display,
                    color_index: None,
                });
                if entry.color_index.is_none() {
                    entry.color_index = color_index.or_else(|| default_finder_tag_color_index(&entry.name));
                }
            }
            return Ok(seen.into_values().collect());
        }
    }

    Ok(vec![])
}

fn default_finder_tag_color_index(name: &str) -> Option<u8> {
    let key = tag_key(name)?;
    DEFAULT_FINDER_TAG_COLORS
        .iter()
        .find_map(|(default_name, color_index)| (tag_key(default_name).as_deref() == Some(key.as_str())).then_some(*color_index))
}

fn finder_plist_candidates(home: &Path) -> [std::path::PathBuf; 2] {
    [
        home.join("Library")
            .join("SyncedPreferences")
            .join("com.apple.finder.plist"),
        home.join("Library")
            .join("Preferences")
            .join("com.apple.finder.plist"),
    ]
}

fn load_finder_tags_from_plist(path: &Path) -> Result<Option<Vec<(String, Option<u8>)>>, Box<dyn Error>> {
    if !path.exists() {
        return Ok(None);
    }

    let mut buf = Vec::new();
    std::fs::File::open(path).and_then(|mut file| file.read_to_end(&mut buf))?;

    let value = plist::Value::from_reader_xml(std::io::Cursor::new(buf.as_slice()))
        .or_else(|_| plist::Value::from_reader(std::io::Cursor::new(buf.as_slice())))?;

    let tags = extract_finder_tags(&value);
    Ok(Some(tags))
}

fn extract_finder_tags(value: &plist::Value) -> Vec<(String, Option<u8>)> {
    let mut results = Vec::new();

    if let Some(names) = array_at_path(value, &["FavoriteTagNames"]) {
        for (slot_index, entry) in names.iter().enumerate() {
            if let Some(name) = entry.as_string() {
                let name = name.trim();
                if !name.is_empty() {
                    results.push((name.to_string(), Some(slot_index as u8)));
                }
            }
        }
    }

    if let Some(vsd) = value.as_dictionary().and_then(|d| d.get("ViewSettingsDictionary")) {
        if let Some(subdict) = vsd.as_dictionary() {
            for key in subdict.keys() {
                if key.ends_with("_Tag_ViewSettings") {
                    let name = key.strip_suffix("_Tag_ViewSettings").unwrap_or(key);
                    if !name.is_empty() {
                        results.push((name.to_string(), None));
                    }
                }
            }
        }
    }

    results
}

fn array_at_path<'a>(value: &'a plist::Value, path: &[&str]) -> Option<&'a Vec<plist::Value>> {
    let mut current = value;
    for key in path {
        current = current.as_dictionary()?.get(*key)?;
    }
    current.as_array()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_finder_tags_returns_ok() {
        let result = list_finder_tags();
        assert!(result.is_ok(), "list_finder_tags should succeed: {:?}", result.err());
        let tags = result.unwrap();
        for tag in &tags {
            assert!(!tag.name.trim().is_empty(), "tag name should not be empty");
        }
    }

    #[test]
    fn extract_finder_tags_favorite_tag_names_uses_finder_color_slot() {
        use plist::Value;
        let mut dict = plist::Dictionary::new();
        let favorites = plist::Value::Array(vec![
            Value::String(String::new()),
            Value::String("Red Tag".into()),
            Value::String("Orange Tag".into()),
            Value::String("Yellow Tag".into()),
        ]);
        dict.insert("FavoriteTagNames".into(), favorites);
        let value = Value::Dictionary(dict);
        let tags = extract_finder_tags(&value);
        assert_eq!(tags.len(), 3);
        assert_eq!(tags[0].0, "Red Tag");
        assert_eq!(tags[0].1, Some(1));
        assert_eq!(tags[1].0, "Orange Tag");
        assert_eq!(tags[1].1, Some(2));
        assert_eq!(tags[2].0, "Yellow Tag");
        assert_eq!(tags[2].1, Some(3));
    }

    #[test]
    fn extract_finder_tags_view_settings_dictionary_keys() {
        use plist::Value;
        let mut dict = plist::Dictionary::new();
        let mut vsd = plist::Dictionary::new();
        vsd.insert("很重要_Tag_ViewSettings".into(), Value::String("dummy".into()));
        vsd.insert("!!!_Tag_ViewSettings".into(), Value::String("dummy".into()));
        vsd.insert("RegularTag_Tag_ViewSettings".into(), Value::String("dummy".into()));
        vsd.insert("SomeOtherKey".into(), Value::String("other".into()));
        let vsd_val = plist::Value::Dictionary(vsd);
        dict.insert("ViewSettingsDictionary".into(), vsd_val);
        let value = Value::Dictionary(dict);
        let tags = extract_finder_tags(&value);
        let names: Vec<&str> = tags.iter().map(|(n, _)| n.as_str()).collect();
        assert!(names.contains(&"很重要"), "should contain Korean tag name");
        assert!(names.contains(&"!!!"), "should contain !!!");
        assert!(names.contains(&"RegularTag"), "should contain RegularTag");
        assert!(!names.contains(&"SomeOtherKey"), "should not contain non-Tag key");
        for (_, color_index) in &tags {
            assert_eq!(*color_index, None, "ViewSettings tags have no color_index");
        }
    }

    #[test]
    fn extract_finder_tags_favorite_takes_precedence_over_view_settings() {
        use plist::Value;
        let mut dict = plist::Dictionary::new();
        let favorites = plist::Value::Array(vec![Value::String(String::new()), Value::String("Common".into())]);
        dict.insert("FavoriteTagNames".into(), favorites);
        let mut vsd = plist::Dictionary::new();
        vsd.insert("Common_Tag_ViewSettings".into(), Value::String("dummy".into()));
        let vsd_val = plist::Value::Dictionary(vsd);
        dict.insert("ViewSettingsDictionary".into(), vsd_val);
        let value = Value::Dictionary(dict);
        let tags = extract_finder_tags(&value);
        assert_eq!(tags.len(), 2, "both FavoriteTagNames and ViewSettingsDictionary entries present");
        let names: Vec<&str> = tags.iter().map(|(n, _)| n.as_str()).collect();
        assert!(names.contains(&"Common"), "should contain tag from FavoriteTagNames");
        assert!(names.contains(&"Common"), "should contain tag from ViewSettingsDictionary too");
        let common_entry = tags.iter().find(|(n, _)| *n == "Common").unwrap();
        assert_eq!(common_entry.1, Some(1), "color_index from FavoriteTagNames slot preserved");
    }

    #[test]
    fn extract_finder_tags_handles_favorite_tag_names() {
        use plist::Value;
        let entries = vec![
            Value::String(String::new()),
            Value::String("Orange".to_string()),
            Value::String("Green".to_string()),
        ];
        let plist = plist::Value::Dictionary(
            vec![("FavoriteTagNames".to_string(), Value::Array(entries))]
                .into_iter()
                .collect(),
        );
        let names = extract_finder_tags(&plist);
        assert!(!names.is_empty());
        assert!(names.iter().any(|(n, _)| n == "Orange"));
        assert!(names.iter().any(|(n, _)| n == "Green"));
    }

    #[test]
    fn finder_plist_candidates_returns_valid_paths() {
        let home = Path::new("/tmp");
        let candidates = finder_plist_candidates(home);
        assert_eq!(candidates.len(), 2);
        assert!(candidates[0].to_string_lossy().contains("SyncedPreferences"));
        assert!(candidates[1].to_string_lossy().contains("Preferences"));
    }

    #[test]
    fn build_tag_entries_preserves_registered_custom_tag_color_index() {
        let registered_tags = vec![MdItemUserTag {
            name: "!!!".to_string(),
            color_index: Some(1),
        }];
        let color_map = build_color_map(&registered_tags);
        let display_map = build_display_map(&registered_tags);
        let tags = vec!["!!!".to_string()];
        let entries = build_tag_entries(&tags, &color_map, &display_map).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(
            entries[0].as_string(),
            Some("!!!\n1"),
            "registered custom tag color should be preserved"
        );
    }

    #[test]
    fn build_tag_entries_uses_finder_favorite_slot_color_index() {
        use plist::Value;

        let mut dict = plist::Dictionary::new();
        dict.insert(
            "FavoriteTagNames".into(),
            Value::Array(vec![Value::String(String::new()), Value::String("Important".into())]),
        );

        let registered_tags = extract_finder_tags(&Value::Dictionary(dict))
            .into_iter()
            .map(|(name, color_index)| MdItemUserTag { name, color_index })
            .collect::<Vec<_>>();
        let color_map = build_color_map(&registered_tags);
        let display_map = build_display_map(&registered_tags);
        let entries = build_tag_entries(&["Important".to_string()], &color_map, &display_map).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].as_string(), Some("Important\n1"));
    }

    #[test]
    fn default_finder_tag_color_indexes_match_apple_contract() {
        assert_eq!(
            DEFAULT_FINDER_TAG_COLORS,
            &[
                ("Red", 1),
                ("Orange", 2),
                ("Yellow", 3),
                ("Green", 4),
                ("Blue", 5),
                ("Purple", 6),
                ("Gray", 7),
            ]
        );
    }

    #[test]
    fn build_color_map_keeps_registered_color_for_builtin_name() {
        let registered_tags = vec![MdItemUserTag {
            name: "Red".to_string(),
            color_index: Some(7),
        }];

        let color_map = build_color_map(&registered_tags);

        assert_eq!(color_map.get("red"), Some(&7));
    }

    #[test]
    fn build_color_map_falls_back_for_builtin_name_without_registered_color() {
        let registered_tags = vec![MdItemUserTag {
            name: "Red".to_string(),
            color_index: None,
        }];

        let color_map = build_color_map(&registered_tags);

        assert_eq!(color_map.get("red"), Some(&1));
    }

    #[test]
    fn default_finder_tag_color_index_handles_builtin_names() {
        assert_eq!(default_finder_tag_color_index("Red"), Some(1));
        assert_eq!(default_finder_tag_color_index(" Blue "), Some(5));
        assert_eq!(default_finder_tag_color_index("Custom"), None);
    }

    #[test]
    fn build_tag_entries_unknown_tag_writes_color_0() {
        let registered_tags = vec![];
        let color_map = build_color_map(&registered_tags);
        let display_map = build_display_map(&registered_tags);
        let tags = vec!["CustomTag".to_string()];
        let entries = build_tag_entries(&tags, &color_map, &display_map).unwrap();
        assert_eq!(entries[0].as_string(), Some("CustomTag\n0"));
    }

    #[test]
    fn build_tag_entries_rejects_newline_tag_names() {
        let registered_tags = vec![];
        let color_map = build_color_map(&registered_tags);
        let display_map = build_display_map(&registered_tags);
        let tags = vec!["Bad\nTag".to_string()];

        let result = build_tag_entries(&tags, &color_map, &display_map);

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("newlines"));
    }

    #[test]
    fn build_tag_entries_blue_blue_dedupe_preserves_spelling() {
        let registered = vec![MdItemUserTag {
            name: "Blue".to_string(),
            color_index: Some(5),
        }];
        let color_map = build_color_map(&registered);
        let display_map = build_display_map(&registered);
        let entries = build_tag_entries(&["blue".to_string()], &color_map, &display_map).unwrap();
        assert_eq!(entries[0].as_string(), Some("Blue\n5"));
    }

    #[test]
    fn build_tag_entries_deduplicates_by_key() {
        let registered = vec![MdItemUserTag {
            name: "Blue".to_string(),
            color_index: Some(5),
        }];
        let color_map = build_color_map(&registered);
        let display_map = build_display_map(&registered);
        let entries = build_tag_entries(&["Blue".to_string(), "blue".to_string()], &color_map, &display_map)
            .unwrap();
        assert_eq!(
            entries.len(),
            1,
            "should deduplicate Blue/blue to single entry"
        );
        assert_eq!(entries[0].as_string(), Some("Blue\n5"));
    }
}
