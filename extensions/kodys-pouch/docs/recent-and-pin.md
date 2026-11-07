# Recents and Pins

## Problem Statement

When I open the Pouch I have to search or scan Origins and Parents to get back to a Tool or Skill I just used. I also have no way to keep a small set of daily items at the top. The inventory is A-Z. Opening always starts at All.

## Solution

When the query is empty, the Pouch shows a Pinned section (up to 5) then a Recent section (up to 5) above the existing Origin and Parent groups. A pick records a Recent. A Pin action keeps an item at the top until I unpin it. Scope still hides rows. Search still replaces this layout with today's match list.

## User Stories

1. As a Pouch user, I want to see my Recents when I open the Pouch, so that I can pick a Tool or Skill I just used without searching.
2. As a Pouch user, I want at most 5 Recents, so that the top of the list stays short.
3. As a Pouch user, I want Recents in pick order, newest first, so that the last pick is the first Recent row.
4. As a Pouch user, I want a pick to record a Recent, so that Paste Mention is what fills the section.
5. As a Pouch user, I want picking the same item again to move it to the front of Recents, so that I do not see duplicates.
6. As a Pouch user, I do not want Copy Mention to record a Recent, so that Clipboard Fallback stays a fallback and not a pick.
7. As a Pouch user, I want closing the Pouch without a pick to leave Recents unchanged, so that browsing does not rewrite Recents.
8. As a Pouch user, I want to Pin an item, so that it stays at the top across opens.
9. As a Pouch user, I want at most 5 Pins across the Pouch, so that Pin stays scarce.
10. As a Pouch user, I want newest Pin first, so that the Pin I just added is the first Pinned row.
11. As a Pouch user, I want Pin and Unpin to stay in the Pouch, so that I can mark items without pasting a Mention.
12. As a Pouch user, I want Pin and Unpin on `⌘⇧P`, so that the action matches other Raycast lists.
13. As a Pouch user, I want a pin accessory on a Pinned row, so that I can see it is pinned without reading the section title.
14. As a Pouch user, I do not want a toast when a Pin succeeds, so that the row moving is the only feedback.
15. As a Pouch user, I want a sixth Pin to refuse with a toast, so that I know I must unpin one first.
16. As a Pouch user, I want Pinning not to count as a pick, so that marking an item does not paste a Mention or close the Pouch.
17. As a Pouch user, I want Pinned above Recent, so that durable marks beat Recents.
18. As a Pouch user, I want a Pinned item omitted from Recent, so that I do not see the same row twice.
19. As a Pouch user, I want Recent to fill up to 5 items that are not Pins, so that pinning daily Tools does not empty Recent.
20. As a Pouch user, I want unpinning to restore an item to Recent when it is still Recent, so that the two lists stay independent.
21. As a Pouch user, I want picking a Pinned item to still remember it as Recent, so that unpinning can restore it.
22. As a Pouch user, I want Pinned and Recent hidden when empty, so that a first-time open still looks like today's list.
23. As a Pouch user, I want Pinned and Recent only when the query is empty, so that search stays a match list.
24. As a Pouch user, I want typing a query to hide Pinned and Recent even if those items match, so that search does not grow a second ranking.
25. As a Pouch user, I want clearing the query to bring Pinned and Recent back, so that I return to the open layout.
26. As a Pouch user, I want Scope to hide Pinned and Recent rows that are out of Scope, so that Skills does not show pinned Tools.
27. As a Pouch user, I want the 5-Pin cap to stay global, so that 5 pinned Tools still block a sixth Pin in Skills.
28. As a Pouch user, I want Recent fill to honor Scope, so that Skills shows up to 5 recent Skills, not Tools.
29. As a Pouch user, I want All to show Pinned and Recent from every Kind, so that opening the Pouch is still All.
30. As a Pouch user, I want a Parent Scope to show only that Parent's Pinned and Recent Tools, so that a Package list stays tight.
31. As a Pouch user, I want a Pinned or Recent item omitted from its Origin or Parent group, so that the same row is not listed twice.
32. As a Pouch user, I want Origin and Parent groups to keep today's A-Z order after those omissions, so that the rest of the Pouch is unchanged.
33. As a Pouch user, I want a one-group inventory to still show Pinned and Recent as sections when those lists are non-empty, so that the top is visible even when the rest is flat.
34. As a Pouch user, I want row titles, subtitles, icons, and Mentions on Pinned and Recent rows to match the same item elsewhere, so that a Pin is not a different object.
35. As a Pouch user, I want picking a Recent or Pinned row to paste the same Mention as today, so that the destination is still the Active Input.
36. As a Pouch user, I want Refresh Pouch to leave Pins and Recents in place, so that a fetch does not wipe marks.
37. As a Pouch user, I want last-good inventory to still resolve Pins and Recents, so that a failed fetch does not hide the top of the list.
38. As a Pouch user, I want a Pin or Recent whose item has left inventory to disappear, so that I never see a ghost row.
39. As a Pouch user, I want a Skill and a Tool that share a display name to pin and recent separately, so that Kind stays split.
40. As a Pouch user, I want root package exports to stay out of Pins and Recents, so that the Pouch still hides `.` / `__root__`.
41. As a Pouch user, I want empty-state copy to stay today's copy when there are no inventory rows, so that Pins do not invent a new empty Pouch.
42. As a Pouch user, I want an empty Skills Scope with only pinned Tools to still say there are no Skills, so that Scope empty states stay honest.
43. As a Pouch user, I want Pin available on Origin, Parent, Recent, and Pinned rows, so that I can mark an item from wherever I see it.
44. As a Pouch user, I want Unpin only on a Pinned item, so that the action name matches the state.
45. As a Pouch user, I want Pins and Recents to survive quitting Raycast, so that opening tomorrow still shows the top.
46. As a Pouch user, I do not want Pins or Recents evicted by last-good cache pressure, so that marks outlive an inventory rewrite.
47. As a Pouch user, I want picking a sixth distinct item to drop the oldest unpinned Recent, so that Recent stays at 5 visible rows.
48. As a Pouch user, I want the sixth-pin toast to name the limit, so that I know why the Pin failed.
49. As a Pouch user, I want pinning a Recent to move it into Pinned in place, so that I do not hunt for it in a lower group.
50. As a Pouch user, I want no new Raycast command, so that the Pouch stays the only command.

## Implementation Decisions

- One presentation function already turns inventory, query, and Scope into sections. Extend that function with two key lists: Pins and Recents. When the query is empty, emit a Pinned section then a Recent section, then today's Origin and Parent groups (or today's flat list). When the query is nonempty, emit today's search sections and ignore the two lists for layout.
- Keys are the existing stable item keys. Persist keys, not copies of the item. Resolve keys against the current inventory (including last-good). Drop keys that do not resolve. Root exports never resolve.
- Pin and Recent lists are global. Scope filters which resolved items appear. The Pin cap is 5 keys on the global list, not 5 visible rows.
- Recent storage keeps enough keys to fill 5 visible unpinned rows after inventory and Scope filters. Visible Recents are those keys, in stored order, that resolve, are in Scope, and are not Pins, truncated to 5.
- A pick prepends that key on the Recent list and dedupes. Clipboard Fallback does not. Pin and Unpin do not.
- Pin prepends on success. A Pin when 5 keys are already stored refuses and does not change the list. Unpin removes that key. A later pick does not reorder Pins.
- Persist both lists in LocalStorage. Do not put them in Cache. Cache already holds last-good inventory and may evict.
- Pin / Unpin live in the action panel. Shortcut is `⌘⇧P`. Pinned rows show a pin accessory. Success is silent. Refuse shows a toast. Neither action pastes or closes.
- Pick stays Paste Mention, with `onPaste` as the record hook. Copy Mention stays Clipboard Fallback.
- Hide a section when it has no rows after Scope and inventory filters.
- Refresh Pouch revalidates inventory only. It does not clear LocalStorage lists.
- No per-Scope lists, no pin reorder, no unpin-all, no new command.

## Testing Decisions

A good test asserts the visible sections and the next key lists. It does not assert LocalStorage, Raycast actions, or shortcuts.

Test the presentation function and the two list-update functions. Same style as today's section and Scope tests: inventory fixtures, then assert section titles and row names, or the next Pin / Recent keys.

Prior art is the existing presentation tests: empty query groups Origins then Parents, one group flattens, search keeps sections among matches, Scope empty states stay on inventory not on extra chrome.

Cover at least: empty query emits Pinned then Recent then today's groups; nonempty query omits those sections; Pins and Recents omit from lower groups; Scope hides out-of-Scope rows; visible Recents fill to 5 unpinned; sixth Pin refuses; pick prepends Recent and does not pin; pin prepends and does not record a pick; unpin restores a still-Recent key; unresolved keys disappear; a Skills Scope with 5 Tool Pins still refuses a sixth Pin.

## Out of Scope

- Per-Scope Pin or Recent lists
- Reordering Pins
- Unpin all, clear Recents
- Recording Recents from Copy Mention
- A second Raycast command
- Syncing lists across machines
- Changing Mention shape, Active Input paste, or discovery
- Showing Pinned or Recent during search

## Further Notes

Store extensions (open-folders, clean-text, random-data-generator) use a Pinned section, LocalStorage keys, and `⌘⇧P`. None cap Pins at 5. The cap and the sixth-pin refuse are Pouch-specific.

Issue tracker publish was skipped. The user asked to save this spec locally. No `ready-for-agent` triage labels exist in this repo.

## Seam

One existing seam: the function that presents the Pouch as sections.

One sibling seam in that same module: pure updates to the Pin and Recent key lists (record a pick, pin, unpin). Needed so the global cap and Recent fill can be tested without Raycast.

Confirm this seam before implement.
