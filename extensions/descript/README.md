# Descript for Raycast

Send files to Descript, browse your projects, run Underlord, and track every job from Raycast, without opening the app.

## Import from Finder in one keystroke

The fastest way to get media into Descript. **Select files in Finder, trigger _Import Selected Media_, and hit Enter.** Raycast requests the upload URLs, then hands each file off to a **detached background upload**, so you can dismiss Raycast (or close the window) the instant you submit and the transfer keeps running.

- Drop files into a **brand-new project** (a "Main" composition is created for your audio/video automatically) or **add to an existing project** with type-to-search.
- Upload **many files at once**, in parallel, right from your current Finder selection.
- Watch progress in the **menu bar** and **Recent Jobs**, with per-file status, completion, and failures, even after Raycast is gone.

No drag-and-drop, no waiting on a modal, no babysitting the upload.

## Everything else

- **Import Selected Media:** the headline flow above. Finder selection into a new or existing project, with a detached background upload that survives dismissing Raycast.
- **Browse Projects:** a paginated, searchable list with an inline detail pane (composition and media counts and durations) and a drill-in Contents view that deep-links straight to the Descript web app.
- **Run Underlord Prompt:** pick a project (and optionally a composition), choose a starter preset or one of your saved favorites, and kick off an Underlord one-shot edit. Save your own prompts for reuse.
- **Publish Composition:** from Browse Projects or Contents, start a video or audio publish. The share URL shows up in Recent Jobs and the menu bar the moment it's ready (Copy or Open).
- **Recent Jobs:** live status for imports, Underlord edits, and publishes. Filter by type, paginate without losing in-flight updates, cancel running jobs, and copy share URLs.
- **Descript Activity (menu bar):** an at-a-glance count of active uploads and in-progress jobs, with quick jumps into each command and a manual **Refresh Now**.

## Setup

You'll need a personal API token from Descript.

1. In **Descript**, open **Settings** and choose **API tokens** in the sidebar, then click **Create token**.
2. Give the token a name and select the **Drive** it should be associated with, then click **Create token** again.
3. **Copy the token immediately.** Descript shows it once and you can't view it again. If you lose it, generate a new one.
4. Treat it like a password (anyone with the token can act as you against Descript). In Raycast, open **Extensions**, find **Descript**, and paste the token into **Descript API Token**.

Your token is stored locally in Raycast's encrypted database and sent directly to `https://descriptapi.com` over HTTPS as `Authorization: Bearer <token>`. There's no proxy in between.

## How it works

- **Detached uploads:** _Import Selected Media_ spawns each file's upload as a detached `curl` process, so dismissing Raycast doesn't cancel it. Progress is mirrored to per-file status files under the extension's support directory, which the menu bar and Recent Jobs read back. Finished records auto-clear 7 days later (or dismiss them yourself).
- **Polling, not webhooks:** a desktop client can't reliably accept inbound webhooks, so Recent Jobs polls each in-flight job every few seconds and the menu bar polls the bulk job list. Rate-limit responses are respected (`Retry-After`) and retried on the next tick.
- **Adaptive menu-bar refresh:** _Descript Activity_ only calls the API when something is actually in flight. Otherwise it backs off to a light refresh, keeping steady-state usage minimal.
- **Cross-command sync:** kicking off any job immediately wakes the menu bar so new work appears without waiting, and Recent Jobs nudges it again on every job-state change so both surfaces stay in step.
- **Stale-while-revalidate:** lists render instantly from Raycast's cache, then refresh in the background. Project detail loads lazily for the focused row.
- **Personal API tokens only:** there's no separate login step. The first API call uses your token, and missing or invalid tokens surface a clear **Open Extension Preferences** action. OAuth is out of scope for v1.
