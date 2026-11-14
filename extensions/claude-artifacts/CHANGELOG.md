# Claude Artifacts Changelog

## [US English and a redundant action title] - 2026-09-24

- Spelling is now US English throughout the extension, its scripts, and its docs — 27 words across nine files that had drifted to British forms
- **Show Index in Finder** drops its hand-written title and icon so it picks up Raycast's own defaults

## [Run Doctor] - 2026-09-21

- **The recording hook stopped recording on 2026-09-10 and nothing said so.** Artifact URLs changed from `claude.ai/code/artifact/<uuid>` to `claude.ai/artifact/<slug>`; the hook matched the UUID form, stopped recognizing its own payload, and — because it must never fail a Claude Code turn — went on exiting cleanly on every publish. Fixed by matching the shape of the URL and treating the id as opaque, which is the part that will change again
- Added a **Run Doctor** command, which checks the whole chain and says which link is broken: `jq` and `perl`, the recorder script, its registration, the index, and coverage against your transcripts
- The check that matters actually **runs your installed hook** against a throwaway `HOME` and a current-format URL, rather than confirming the file exists. Every structural check was green throughout the outage — only behavior could have caught it
- Added **Backfill Missing Artifacts**, which recovers publishes the hook dropped by reading your local Claude Code transcripts. No network calls; it is strictly append-only — it never modifies or removes a row that is already there — and it copies the index aside first
- Backfill takes the same kernel lock the recorder uses, so it cannot lose a row to a publish landing mid-write
- A row that has lost its URL now rebuilds it in the right scheme for its id, instead of always guessing the old one

## [Pin Artifacts] - 2026-08-29

- Added **Pin Artifact** (⌘.) — pinned artifacts collect in a **Pinned** section at the top of the list, which is what you want once you have enough of them that recency alone stops finding the one you keep coming back to
- Pins hold inside a project filter too, so filtering does not scatter them back into the pile
- Moved to `@raycast/api` 2.1

## [Tell You When Tracking Stops] - 2026-08-27

- Added an **Artifact Tracking Is Off** row at the top of the list when the Claude Code hook is not registered — until now a list that had quietly stopped updating looked exactly like one that was up to date
- Added a **Set Up Artifact Tracking** screen with a prompt you can paste into Claude Code to install and register the hook for you, instead of leaving you holding a JSON fragment with nowhere to put it
- The same screen now backs the first-run empty state, so setup instructions no longer differ depending on how you got there
- Renamed the Finder actions from **Reveal** to **Show**, matching the verb Raycast uses elsewhere
- Updated the Store screenshot, which still showed action names from before the previous release
- Moved to `@raycast/api` 2.0 — no behavior change, and it clears every outstanding dependency advisory

## [Open the Artifact Galleries] - 2026-08-03

- Added **View Claude Code Artifacts** (⌘⇧O) and **View Claude Artifacts** (⌘⇧G), which open the two galleries on claude.ai
- These appear in every state, including the empty ones — when an artifact was published from the chat app or from another machine, it is legitimately absent from the local index, and the gallery is where it actually lives
- Shortened the per-artifact actions to **Open** and **Open Folder**

## [Initial Version] - 2026-07-27

- Search your Claude Code artifacts by title or project, sorted most-recent-first
- Open an artifact in the browser, copy its link or title, or reveal the project folder it was published from
- Filter by project once more than one project has recorded artifacts
- Reads a local index at `~/.claude/artifacts.json` — no network calls, no API key
- Ships the `PostToolUse` hook that records artifacts as you publish them, plus a diagnostic probe for verifying the hook yourself
