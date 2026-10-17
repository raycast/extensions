# Changelog

## [Reliable Related Article Actions] - 2026-10-14

- Prevent overlapping read and favorite updates in related-article details.
- Restore the last confirmed article state when an archive update fails.

## [Article State Reliability] - 2026-10-14

- Select the next unread article only after the archive refresh completes.
- Keep read and favorite actions in related-article details synchronized with their current state.
- Respect the configured Return key action in related-article lists.
- Match personal AI queries against both original and current topic names.

## [Article Discovery and Personal AI] - 2026-10-14

- Find matching older posts live across the public blog archive using topics and meaningful terms.
- Start Search Techgedöns with an optional search query entered directly in Raycast root search.
- Ask Raycast AI for unread or favorite articles, optionally filtered by topic.
- Open the oldest or newest unread article directly in Raycast or the default browser.

## [Live Menu Bar Preferences] - 2026-10-12

- Keep all menu bar display options in the dedicated menu bar command settings and apply changes while it is running.

## [Search and Menu Bar Improvements] - 2026-10-11

- Display the selected text in the Techgedöns search bar so it remains visible and editable.
- Choose whether the menu bar shows 3, 5, or 10 articles per section.
- Choose a very short, short, medium, long, or full menu bar article title.
- Keep all menu bar display options in the shared extension settings so the running menu bar command receives changes consistently.
- Optionally show only unread articles and choose whether the unread counter is always shown, hidden at zero, or always hidden.
- Show favorite articles in a dedicated menu bar section.
- Open the menu bar command settings directly from its menu.

## [Search Selected Text] - 2026-10-10

- Search the public Techgedöns archive using text selected in the frontmost application.

## [Respect Menu Bar Retention] - 2026-10-10

- Keep expired articles hidden in the menu bar when a feed refresh fails.

## [Reliable Menu Bar Synchronization] - 2026-10-10

- Keep menu bar article state consistent when multiple Raycast commands update the archive at the same time.

## [AI Tools, Sharing, and Menu Bar] - 2026-10-10

- Ask Techgedöns questions directly from Raycast AI with live results from the public blog archive.
- Search articles, retrieve the latest posts, and load complete articles through dedicated AI tools.
- Copy an article as a Markdown link.
- Copy an article title together with its URL.
- Copy an article title, summary, and URL.
- Optionally show the unread count and five latest articles in the macOS menu bar, with configurable date and category details.
- Shorten long menu bar titles while keeping the complete title available as a tooltip.

## [Archive Reliability] - 2026-10-09

- Keep saved articles visible and apply the selected retention when a feed refresh fails.
- Preserve newer read and favorite states during background refreshes.
- Store every fitting article when an archive safety limit is reached and keep the incomplete state visible.
- Continue search pagination normally after changing the query during a page load.

## [Initial Release] - 2026-10-02

- Browse the latest Techgedöns articles in a compact list.
- Search the complete public blog archive and filter results by topic.
- Keep a local article archive with read status, favorites, and configurable retention.
- Ask questions about archived articles with Raycast AI and linked sources.
- Open articles in Raycast or the default browser and copy article links.
- Refresh articles manually or with Raycast Background Refresh.
- Use a US English command interface with the original German blog topics.
