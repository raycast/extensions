# Layout Hotkeys Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Four **Switch to Layout** commands, each selecting an input source you assign, so a single hotkey lands on a specific
  layout instead of cycling through all of them
- **Configure Layout Slots** to assign the four slots from your enabled input sources
- **Convert Selection to Layout 1–4** to rewrite text typed with the wrong layout active, mapping each character through
  the physical key that produced it so any pair of enabled layouts works without per-language tables
- **Convert Selection** to preview the selection rewritten into every layout before picking one
- Converts the whole focused field when nothing is selected, asking first if that means rewriting more than 200
  characters
- **Switch Input Source** to browse and switch from a searchable list
- **Cycle Input Source** and **Show Current Input Source**
- Waits for Raycast to give up focus before switching, so the new layout applies to the app you were typing in even
  with "Automatically switch to a document's input source" enabled
