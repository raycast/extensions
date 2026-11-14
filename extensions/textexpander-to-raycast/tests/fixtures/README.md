# TextExpander fixtures

These are sanitized extracts of published TextExpander files. They are checked in as property lists and read through `readLibraries`, including macOS `plutil`. The fixture tests do not generate them from `snippet()` or `groupData()`. Settings bundles are covered separately with generated property lists.

## Sources

- `legacy-settings.textexpander` comes from the application's bundled [Default.textexpander](https://github.com/jessegrosjean/NOTTaskPaperForIOS/blob/455ff0ea1768f6ed0abfc731bc7f5ce8e73c0314/Resources/Default.textexpander) in `jessegrosjean/NOTTaskPaperForIOS`, commit `455ff0ea1768f6ed0abfc731bc7f5ce8e73c0314`. It retains the legacy settings structure, including `groupsTE2`, `snippetUUIDs`, `snippetsTE2`, dates, flags, and preferences. The upstream [license](https://github.com/jessegrosjean/NOTTaskPaperForIOS/blob/455ff0ea1768f6ed0abfc731bc7f5ce8e73c0314/LICENSE.md) dedicates this resource to the public domain.
- `group-export.textexpander` comes from [Emoji-Log.textexpander](https://github.com/ahmadawais/Emoji-Log/blob/33cb47ab99b0b3e1cae4c18775bd6c7730a29dff/Emoji-Log.textexpander) in `ahmadawais/Emoji-Log`, commit `33cb47ab99b0b3e1cae4c18775bd6c7730a29dff`. It retains the exported `groupInfo.groupName` and `snippetsTE2` layout. The upstream MIT notice is included in [Emoji-Log-LICENSE.txt](Emoji-Log-LICENSE.txt).

## Sanitization

Each source was parsed and serialized as XML once when adding these fixtures. Original dictionary keys and property-list value types were retained. Group and snippet names, abbreviations, and content were replaced with neutral examples. UUIDs were replaced consistently, dates were set to 2020-01-01, and unrelated strings were cleared. Group exports were reduced to two snippets. No original snippet text, account information, or usage hashes remain.

The fixture tests check group membership, plain-text type detection, label fallback, keywords, line breaks, and converted names against explicit expected values. Keep the source links pinned when changing these files, and document any further sanitization here.
