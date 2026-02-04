# Raycast ↔ Dashboard Integration – Feature Ideas

Features that tie the Neuron dashboard and Raycast extension together so both feel like one workflow.

---

## ✅ Already in place

- **Create Note** – quick capture with title, content, URL, tags (saved as Raycast type in dashboard)
- **Search Content** – notes, folders, tags; **content preview** in detail; **Start Recall** and Open in Browser
- **Write Journal** – date picker, append with markdown (#, ##, -, [ ], [x], etc.); toast when date already has a note
- **Open in Browser** / **Copy Link** – dashboard deep links for notes, folders, tags
- **Start Recall** – open note in dashboard with `?recall=1` and auto-start recall
- **Raycast object type** in dashboard sidebar (when at least one note from Raycast exists)

---

## 🔧 Configuration & environment

| Feature                      | Why it helps                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard URL preference** | Use production (e.g. `https://app.neuron.com`) instead of hardcoded `localhost:3000` so Raycast works with your real dashboard. |
| **Optional: API base URL**   | Same as above; single “Dashboard URL” used for both API and “Open in Browser” links.                                            |

_Implementation: Add a preference `dashboardUrl` (default `http://localhost:3000`), use it in `utils/api.ts` for `API_URL` and all Open-in-Browser URLs._

---

## 📝 Create Note ↔ Dashboard

| Feature                         | Why it helps                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Choose folder when creating** | New note goes into the right place (e.g. “Journal”, “Inbox”, “Projects”) without opening the dashboard.   |
| **“Open after create”**         | After creating a note, open it in the browser (or Start Recall) so you continue there.                    |
| **“Create & start recall”**     | One action: create note → open dashboard with recall for that note (needs note ID in URL + recall param). |

_APIs: `GET /api/clip/raycast/folders` exists; clip API would need to accept `folderId` (or similar) to create note in folder._

---

## 🔍 Search Content ↔ Dashboard

| Feature                                   | Why it helps                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Filter by folder**                      | Dropdown “In Folder: All / Inbox / Journal / …” so results match how you organize in the dashboard.              |
| **Filter by tag**                         | “Tag: All / #work / #ideas” so search matches dashboard tag usage.                                               |
| **“Open folder in dashboard” for a note** | From a note result, action “Open folder” that goes to that note’s folder in the dashboard (needs folder in API). |
| **“Copy note content”**                   | Copy plain text of the note (you already have `contentPreview`) for pasting elsewhere.                           |
| **“Add to folder” / “Add tag”**           | From search, move note to folder or add/remove tag without opening the dashboard (needs PATCH/move/tag APIs).    |

_APIs: Content search could accept `folderId` / `tagId`; note update/move/tag endpoints would need to be exposed for Raycast (or already exist under dashboard)._

---

## 📅 Journal ↔ Dashboard

| Feature                                 | Why it helps                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **“Open today’s journal in dashboard”** | Single action: open dashboard on today’s journal note (or create and open).                                    |
| **“Recent journal entries” command**    | List last 7–14 days; each row: “Feb 3 – Open / Append”. Opens dashboard or runs “Write Journal” for that date. |
| **Journal in Search Content**           | When searching, include daily journal notes (by title/date) so “Feb 3” or “journal” finds them.                |

_APIs: Journal check/create exist; could add “list recent journal dates” or rely on search with a “Journal” folder filter._

---

## 🧠 Recall ↔ Dashboard

| Feature                             | Why it helps                                                                                                                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **“Start recall” from Create Note** | After submitting “Create Note”, optionally “Open & start recall” in dashboard for the new note.                                                                                                      |
| **Recall link in dashboard**        | In the dashboard, “Open in Raycast” link that deep-links to Search Content with that note pre-selected (if Raycast supports it) or at least “Copy Raycast-style link” (dashboard URL + `?recall=1`). |

_Implementation: Create-note flow returns `noteId`; open `{dashboardUrl}/organizations/{slug}/notes/{noteId}?recall=1`._

---

## 🗂️ Folders & navigation

| Feature                      | Why it helps                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **“Search Folders” command** | List all folders (flat or tree), open folder in dashboard, copy folder link. Uses existing `GET /folders`.  |
| **“Open dashboard” actions** | Quick links: “Open Home”, “Open Journal”, “Open Search” so Raycast is the launcher for key dashboard pages. |

_Implementation: Add command that shows 3–5 items: Home, Journal, Search, etc., each opening a fixed dashboard URL._

---

## 📌 Suggested order to implement

1. **Dashboard URL preference** – so the extension works in production.
2. **“Open after create”** and/or **“Create & start recall”** – tight loop between Raycast and dashboard.
3. **“Copy note content”** in Search Content – no new API, reuses `contentPreview`.
4. **Search filters (folder / tag)** – better alignment with how you work in the dashboard.
5. **“Search Folders” command** – if you often open folders from Raycast.
6. **Create note in folder** – requires API support for `folderId` on create.

---

## 🆕 More ideas

| Feature                                          | Why it helps                                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Copy note content** (action in Search Content) | Copy `contentPreview` to clipboard without opening the dashboard.                                               |
| **Quick Open Dashboard** command                 | Single command: list Home, Journal, Search, Raycast notes; open chosen page in browser.                         |
| **Search Folders** command                       | List folders (from `GET /folders`), open or copy folder link.                                                   |
| **Filter Search by type**                        | In Search Content: Notes only, Folders only, Tags only or Raycast only (reuse content API or add `type` param). |
| **Recent notes** command                         | List last 10–20 notes (any type or Raycast-only), open or start recall.                                         |
| **Paste as note**                                | Command that creates a note from clipboard (title = first line or "Pasted note", content = clipboard).          |
| **Default folder for new notes**                 | Preference: Default folder (optional); send with create-note so notes land in the right place.                  |
| **Subtext in Search**                            | In list rows, show Folder: Inbox or Updated 2h ago so you can scan faster.                                      |
| **Empty state actions**                          | When Search has no results: Create note or Open dashboard so the next step is one click.                        |

Use this list to pick the next slice that gives the most “one product” feel between the website and the Raycast extension.
