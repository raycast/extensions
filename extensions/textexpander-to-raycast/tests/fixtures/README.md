# TextExpander fixtures

These are sanitized extracts of published TextExpander files. They are checked in as property lists and read through `readLibrary`, including macOS `plutil`. The tests do not generate them from `snippet()` or `groupData()`.

## Sources

- `legacy-settings.textexpander` comes from the application's bundled [Default.textexpander](https://github.com/jessegrosjean/NOTTaskPaperForIOS/blob/455ff0ea1768f6ed0abfc731bc7f5ce8e73c0314/Resources/Default.textexpander) in `jessegrosjean/NOTTaskPaperForIOS`, commit `455ff0ea1768f6ed0abfc731bc7f5ce8e73c0314`. It retains the legacy settings structure, including `groupsTE2`, `snippetUUIDs`, `snippetsTE2`, dates, flags, and preferences. The upstream [license](https://github.com/jessegrosjean/NOTTaskPaperForIOS/blob/455ff0ea1768f6ed0abfc731bc7f5ce8e73c0314/LICENSE.md) dedicates this resource to the public domain.
- `group-export.textexpander` comes from [Emoji-Log.textexpander](https://github.com/ahmadawais/Emoji-Log/blob/33cb47ab99b0b3e1cae4c18775bd6c7730a29dff/Emoji-Log.textexpander) in `ahmadawais/Emoji-Log`, commit `33cb47ab99b0b3e1cae4c18775bd6c7730a29dff`. It retains the exported `groupInfo.groupName` and `snippetsTE2` layout. The upstream MIT notice is included in [Emoji-Log-LICENSE.txt](Emoji-Log-LICENSE.txt).
- `Settings.textexpandersettings/` comes from the [settings bundle](https://github.com/glensk/dotfiles/tree/da6711f3cb35bb1250ff81f181ac6a309d282888/mac_textexpander/Settings.textexpandersettings) in `glensk/dotfiles`, commit `da6711f3cb35bb1250ff81f181ac6a309d282888`. Its group file is an extract of `group_0EA7C738-0E5C-4349-B26C-D0878D4E5618_4434906653.xml`, alongside the sanitized `index_67FAF7E3-E4AC-5514-8AB0-8881916B3B47_4434906653.xml`. The original snippet content is omitted. The fixture preserves the group file's `name`, `snippetPlists`, UUID references, and integer flags. The index retains its separate `groupsTE5` layout to verify that the reader ignores bundle metadata.

## Sanitization

Each source was parsed and serialized as XML once when adding these fixtures. Original dictionary keys and property-list value types were retained. Group and snippet names, abbreviations, and content were replaced with neutral examples. UUIDs were replaced consistently, dates were set to 2020-01-01, and unrelated strings were cleared. Group exports and bundles were reduced to two snippets. The bundle index was reduced to the included group, with rejected snippet hashes removed. No original snippet text, account information, or usage hashes remain.

The fixture tests check group membership, plain-text type detection, label fallback, keywords, line breaks, and converted names against explicit expected values. Keep the source links pinned when changing these files, and document any further sanitization here.
