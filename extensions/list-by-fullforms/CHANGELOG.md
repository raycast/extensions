# List by FullForms Changelog

## [Recently Added Section, Description Callouts, and Raycast-Tagged Tokens] - 2026-08-24

- The description field in Quick Add Entry and the entry edit form now speaks the web editor's callout syntax with one keystroke: Cmd+Shift+E, Cmd+Shift+N, and Cmd+Shift+R append an Example, Note, or Reference callout block and focus the field. A ⓘ tooltip on the field documents the syntax for hand-typing
- New "Copy as Mention" action (Cmd+Shift+M) on Search Entries results copies the entry's mention token, ready to paste into any description; the web app renders it as a link to the entry
- Fixed editing an entry silently removing mention links from its description: the edit form previously pre-filled from the display copy (which strips mention tokens for readability) and saved that back, so any edit flattened `[term](#id)` links to plain text. Edits now round-trip the raw description, keeping mentions intact

- Search Entries now opens with a "Recently Added by You" section: your own newest entries, newest first, shown while the search bar is empty and scoped by the same workspace dropdown as search. Rows behave exactly like search results, with the detail pane, star toggle, edit, notes, report, copy, and speech actions all available, so the entry you just added is one keystroke away
- Setup now links to `list.fullforms.com/account?token_client=raycast`, which opens the Generate dialog pre-filled and tags the minted token as Raycast's. Entries added from Raycast then read "via Raycast" in the web app's entry history panel instead of the generic "via API"; teammates viewing the same entry see the same label. Existing tokens were tagged retroactively server-side, so this needs no action from current users

## [Full List Icon Parity with the Web] - 2026-07-27

- Lists now show the same icon here as they do on the web. The glyph set grew from 30 keys to all 92 the web can store, so a list using any of the newer icons (fish, train, truck, ship, banknote, wallet, shopping cart, shirt, radio tower, flask, atom, crypto and the rest) no longer falls back to the default list icon
- Lists that never had an icon picked now resolve to a far more specific one: the name-matching table grew from 9 rules to 55, adding money, legal, accounting, commerce, logistics, marketing, analytics, data, devops, AI, network, security, gaming, design, film, photography, education, team, transport, science, energy, water, outdoor, winter, crypto, broadcast, fashion, auth, mobile and print
- Fixed name matching that picked confidently wrong icons. Terms now match only at the start of a word, so "Labels" and "Collaboration" no longer read as a lab, "Latest Releases" no longer reads as a test, and "Employee Training" no longer reads as a train. Where two terms both match, the more specific one wins, so "Plant Taxonomy" gets a leaf rather than a task clipboard
- Split the single nature icon that used to cover everything living: fish, animals and pets now get their own marks instead of all sharing a leaf

## [Detail Pane Previews, Windows Shortcut Fixes, and Onboarding] - 2026-07-26

- Fixed keyboard shortcuts on Windows: actions such as Open Last Added Entry (Ctrl+O), Open List / View Existing Entry (Ctrl+Shift+O), Edit Entry (Ctrl+E), Star Entry (Ctrl+S), and the note, report, and detail-toggle shortcuts now actually fire; previously their macOS Command bindings were silently ignored on Windows, so the keys did nothing even though the hints looked correct
- Improved the Quick Add Entry and Suggest Entry empty states: they now link straight to the web app's Create a List page, a brand-new account sees a create-your-first-list prompt instead of a permissions message, and a view-only member gets a shortcut to suggest an entry instead
- The Search Entries detail pane now previews first-party `> Image:` description callouts as inline images, matching how they render on the web (non-first-party image URLs stay as plain text)
- The Search Entries detail pane now preserves line breaks in entry descriptions instead of collapsing them into a single paragraph
- Show the entry's workspace avatar in the Search Entries detail pane metadata, falling back to a person or team glyph when the workspace has no avatar
- Expanded the list-icon glyph set to match the web's category picker refresh, so lists using the newer category icons show the matching glyph in Raycast instead of the default list icon

## [Entry Actions, Single Tags Field, and AI Helpers] - 2026-07-12

- The Search Entries "No matches" state now offers an Add Entry action that opens the Quick Add form pre-filled with your search term, so you can create a missing entry without leaving the search
- Added an Edit Entry action (Cmd+E) on search results, shown when you have edit access to the entry's list; it opens a pre-filled form to update the term, type, definition, description, and tags in place
- Added an Add / Edit Note action (Cmd+Shift+N) on search results, so you can attach or update a private note on any entry you can read, with a Delete Note action when one exists
- Added a Report Entry action (Cmd+Shift+R) on search results to flag an entry to the list owner's moderation queue with a reason and an optional note
- Reordered the Quick Add Entry form to List, Type, Entry so the type-aware placeholders on Entry and Definition reflect the chosen type before you start typing
- Simplified tags in Quick Add Entry and the entry editor to a single comma-separated field (existing tag names are reused, new ones are created), replacing the separate existing-tags picker and new-tags text field; the list's existing tags now appear in the field's info tooltip
- Show workspace avatars in the Search Entries workspace picker (falling back to a person or team glyph when a workspace has no avatar) and list icons in the Quick Add Entry and Suggest Entry list pickers
- Lists without an explicitly chosen icon now resolve the same themed icon and color as on the web (name-keyword rules, then a stable per-list fallback color) instead of a colorless default glyph
- Fixed the Quick Add Entry "Last Added" banner and duplicate-entry hint to show the correct shortcut on Windows (Ctrl+O / Ctrl+Shift+O) instead of the macOS Command glyph, since those hints are plain text and aren't auto-translated like action shortcuts
- Added Raycast AI helpers to Quick Add Entry: Generate Definition (Cmd+G) fills the definition from the term, and Generate Description (Cmd+Shift+G) fills the description from the term and definition. These appear only when your Raycast account has AI access

## [Windows Support and Listing Refresh] - 2026-06-15

- The extension now runs on Windows in addition to macOS
- Text-to-speech (Speak Entry / Speak Definition) remains macOS-only, since it uses the built-in `say` binary

## [Initial Release] - 2026-06-12

- Search Entries across every list in every workspace you belong to, with a markdown detail pane, starring, copy actions, and macOS TTS via the built-in `say` binary
- Quick Add Entry with a list picker grouped by workspace, type-aware placeholders, tag picker for existing tags + free-text field for new ones, and live duplicate detection on the term and definition fields
- Suggest Entry for lists you can view but not directly edit: submissions land in the owner's moderation queue
