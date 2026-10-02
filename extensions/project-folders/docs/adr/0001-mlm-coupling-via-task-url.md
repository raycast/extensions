# 0001 — Couple to Magic Link Machine via task URL, not HTTP API

**Status:** Accepted
**Date:** 2026-05-28

## Context

When a project folder is missing one or more of its `Asana.html` / `Google_Drive.html` / `Frame_IO.html` shortcut files, the extension needs a way to let the user create the missing link. The team's existing tool for this is **Magic Link Machine (MLM)**, a Cloudflare Worker + React web app that lives as an Asana app-component inside each task.

MLM exposes both:

- A user-facing web UI keyed by Asana task gid: `https://magicmachine.link/task/{gid}`.
- An HTTP API (`POST /api/links`, `POST /api/frameio/create`, `GET /api/task/{gid}`) on `mlm-worker.adminhvdd.workers.dev`.

We had two viable integration approaches.

## Decision

The extension opens MLM in the user's browser via `https://magicmachine.link/task/{gid}` (using the `linkApp` preference). It does **not** call MLM's HTTP API directly.

The Asana gid is extracted from the project's `Asana.html` shortcut via `/task/(\d+)`. A single `⌘M Open Magic Link Machine` action is exposed when the gid is known; missing-link tags are shown greyed but do not get their own per-service "create" actions, since they would all open the same MLM page.

## Why not call the API directly

MLM's API does not yet create Google Drive folders server-side. Drive folder creation is driven from the MLM web UI through Google Apps Script running in the user's authenticated browser session. Calling `POST /api/links` from the extension would only let us *write back* an already-existing URL to Asana, not *create* the underlying Drive folder. For the actual user goal ("create the missing Drive folder for this project"), the browser session is the load-bearing piece — bypassing it would mean re-implementing the Apps Script flow inside the extension, or waiting for MLM to grow server-side folder creation.

Frame.io creation (`POST /api/frameio/create`) is server-side and could be called directly, but mixing API for one service and web UI for another would split the surface confusingly. One door (the URL) is simpler.

## Consequences

- The extension stays auth-free. No PAT preference, no OAuth dance, no token storage.
- "Create missing link" is always a one-keystroke handoff to the browser, never an in-Raycast form.
- The extension does not need to know the difference between Drive / Frame.io / Figma creation flows — MLM owns that.
- If MLM grows real server-side folder creation for all services, we can revisit and call the API directly to skip the browser hop. That would also let us add per-service `Action.SubmitForm`-style flows.
- The extension is coupled to MLM's URL shape (`magicmachine.link/task/{gid}`). If MLM changes its routing, this extension breaks. Acceptable — same author owns both.
