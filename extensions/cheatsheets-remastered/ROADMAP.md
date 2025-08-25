# Cheatsheets Remastered – Roadmap

This document tracks planned work. Timelines are indicative; scope may shift based on usage and feedback.

## Near-term (1.0.x)
- [x] Local-first defaults: prefer `assets/cheatsheets` over remote
- [x] Content search across local defaults in Search view
- [x] Attribution moved to action menu for local sheets
- [x] GitHub Actions sync job to pull upstream DevHints into `assets/cheatsheets`

## 1.1.0 – User-specified GitHub repositories (feature)
Enable users to add their own GitHub repos of Markdown cheatsheets, browse them in-app, and cache for offline.

- UX
  - [ ] Repos Manager command: list/add/remove repositories
  - [ ] Add repo form: `owner/repo`, optional branch (default `main`/`master`), optional subdirectory filter
  - [ ] Per-repo manual Refresh and Remove
  - [ ] Label items with `Repo: <name>` and show icon
- Data & prefs
  - [ ] Persist repo configs in `LocalStorage` (array of repo objects)
  - [ ] Schema: `{ id, owner, repo, branch, subdir, addedAt, lastSyncAt }`
- Fetching
  - [ ] List repo files via GitHub API (tree or content API)
  - [ ] Apply same exclusions as DevHints sync (non-`.md`, admin files, names with `@`, underscore dirs)
  - [ ] Map `path` → `slug` consistently (subdir-aware)
- Content & Offline
  - [ ] `Service.getSheet()` resolve order: local assets → user repos (cache) → network
  - [ ] Save fetched files to offline cache (per-repo namespace)
  - [ ] Background update (opt-in) with frequency pref; manual refresh always available
- Search
  - [ ] Include repo sheets in title/slug search
  - [ ] Full-text search across repo content (local cache only, 2+ chars, case-insensitive)
- Errors & limits
  - [ ] Handle rate limits and missing tokens gracefully; support optional token per repo and a global token
  - [ ] Network timeouts with clean fallbacks to cache
- QA/Acceptance
  - [ ] Add a repo, see its sheets in Search and Show commands, open and view offline after one view
  - [ ] Remove a repo, its sheets disappear from lists; cached content purged (or orphan-safe)
  - [ ] Refresh updates changed files

## 1.1.x – Indexing & performance
- [ ] Lightweight in-memory index for local + repo sheets (title, tags, content head) for faster filtering
- [ ] Incremental index updates on file add/remove

## 1.2.0 – Metadata & tags
- [ ] Optional frontmatter parsing (`title`, `tags`, `description`, `icon`)
- [ ] Merge frontmatter with derived tags in `DEFAULT_SHEET_METADATA`

## 1.2.x – Export/backup
- [ ] Export favorites, view history, and repo configs to JSON
- [ ] Import/restore flow with validation

## 1.3.0 – Full-text search UX
- [ ] Show matching snippet preview in results (first hit with context)
- [ ] Toggle to search titles only vs. full content

## 1.3.x – Icons & media
- [ ] Smarter icon inference for repo sheets (token + alias heuristics)
- [ ] Optional per-repo icon directory

## 1.4.0 – Preferences polish
- [ ] One place to manage tokens, offline frequency, indexing toggles
- [ ] Clear caches and rebuild index actions

## 1.5.0 – Slug normalization & collisions
- [ ] Deterministic slugging for nested folders (e.g., `subdir/foo` → `subdir/foo`)
- [ ] Collision detection across assets, repos, and customs; disambiguate with source prefix

## Later / Nice-to-have (speculative)
- [ ] Two-way sync for custom sheets (gist or private repo backend) – speculative
- [ ] Rate-limit aware backoff with retry UI per repo
- [ ] Multi-select actions (offline download, favorite, export)

---
Have a suggestion? Open an issue or PR with context and proposed acceptance criteria.

