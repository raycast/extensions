# PomoNotion Raycast Extension

A Raycast extension that runs a Pomodoro timer on macOS and saves work logs to Notion.  
It combines work/break BGM, alarms, work notes, focus levels, early finish, pause, and resume in one workflow.

> **macOS only**  
> Raycast also has a Windows app, but this extension targets **Raycast on macOS**. Audio playback and other OS-specific features are not available on Windows.

**Author:** [Kohinada Makoto](https://x.com/pgp_workstyle)

## Features

- Work, short break, and long break Pomodoro cycles
- Looping BGM during work and breaks (replaceable in preferences)
- Alarm when a session ends
- Work notes and focus level (`High` / `Medium` / `Low`)
- Work log storage in a Notion database
- **Active work minutes** recorded (excluding paused time)
- Early finish during work or breaks

## Who it's for

- Raycast users on **macOS**
- People who want Pomodoro logs in Notion
- People who want reviewable records, not just a timer
- People who like ambient audio while switching between work and breaks

## Requirements

- **Raycast** (macOS)
- **Notion** account (**work log saving works on the free plan**. Multiple dashboard charts are **recommended on Notion Plus** — see below)
- A Notion work-log database (**recommended:** duplicate [PomoNotion Dashboard (Minimal)](https://steady-lighter-6fe.notion.site/PomoNotion-Dashboard-Minimal-e88cd1874cd5837d9b19013da2c206e0?source=copy_link))

## Quick start

After installation:

1. In Notion, **Duplicate** [**PomoNotion Dashboard (Minimal)**](https://steady-lighter-6fe.notion.site/PomoNotion-Dashboard-Minimal-e88cd1874cd5837d9b19013da2c206e0?source=copy_link), or create an equivalent **work log** database manually
2. In Raycast, open **`Configure Notion`**, set `Notion Token` and `Notion Database ID`, and validate the connection
3. Start a session from **`Start Pomodoro`** or **`Pomodoro Status`**

When using the template, follow the duplicated **Getting Started** page for Connect setup and database ID retrieval. See **Notion setup** below for details.

### Default settings

- Work: 25 minutes
- Short break: 5 minutes
- Long break: 15 minutes
- Long break every: 4 completed work sessions
- Session types (`Session Type`): `Main Work` / `Writing` / `Reading` / `Admin`

Timer lengths, volume, and BGM can be changed in Raycast → Extension **Preferences**.

## Daily workflow

1. Start from **Start Pomodoro** or **Pomodoro Status** and choose a **session type**
2. During work … work BGM loops (depending on settings and volume)
3. When work ends … timer completes, or use **Finish Current Work**
4. Enter a **work note** and **focus level**, then save to Notion
5. Continue automatically to a **short break** or **long break**
6. After a break, choose the next **session type** and resume

**Review:** Use the Notion dashboard (weekly charts) or the **work log** database **Today** / **This Week** views. Breaks are not saved to Notion. If dashboard charts do not appear on the free plan, use the **work log** database views instead (see **Notion free plan and dashboard**).

## Commands

Search for these in the Raycast command palette:

| Command | Purpose |
|---|---|
| **Start Pomodoro** | Start a new work session |
| **Pause Pomodoro** | Pause the current session |
| **Resume Pomodoro** | Resume a paused session |
| **Finish Current Session** | Finish the current work or break and continue |
| **Discard Session** | During work: save to Notion then stop / during break: stop without saving |
| **Pomodoro Status** | View status, pause/resume, enter work logs, early finish, edit timer and session types |
| **Configure Notion** | Validate Notion connection and database schema |

## Bundled audio

Default BGM and alarm files:

| Use | Content | Source |
|---|---|---|
| Work | Rain ambience (loop) | [Pixabay — Nature copyright free rain sounds](https://pixabay.com/sound-effects/nature-copyright-free-rain-sounds-331497/) |
| Break | Piano (loop) | [Pixabay — Musical the last piano](https://pixabay.com/sound-effects/musical-the-last-piano-112677/) |
| Session end | Bell | [Pixabay — Film special effects bell fx](https://pixabay.com/sound-effects/film-special-effects-bell-fx-410608/) |

All are from [Pixabay](https://pixabay.com/) under the [Pixabay Content License](https://pixabay.com/service/license-summary/).

Replace them in Raycast → Extension **Preferences** via `Work Sound File`, `Break Sound File`, and `Alarm Sound File`.

## Notion setup

You need **one** Notion database for work logs.  
**Recommended:** duplicate the public [**PomoNotion Dashboard (Minimal)**](https://steady-lighter-6fe.notion.site/PomoNotion-Dashboard-Minimal-e88cd1874cd5837d9b19013da2c206e0?source=copy_link) (includes dashboard, work log DB, and a Getting Started guide). The Raycast extension itself does not ship a Notion template.

**Duplicate link:** https://steady-lighter-6fe.notion.site/PomoNotion-Dashboard-Minimal-e88cd1874cd5837d9b19013da2c206e0?source=copy_link

### What's in PomoNotion Dashboard (Minimal)

| Item | Contents |
|---|---|
| Dashboard (top) | Three weekly summary charts (daily work time / session type / focus) |
| **Work log** DB | Extension target. Views (All / Today / This Week) and two charts |
| **Getting Started** | Notion setup guide |

> **Notion free plan and dashboard**  
> **Saving work logs** via this extension (`Configure Notion` and database writes) works on Notion's **free plan**.  
> The Minimal template **Dashboard** places **three chart views** on one page. On the **free plan**, Notion limits how many charts can appear on a single page, so dashboard charts may **not all render** (the template has 3 dashboard charts plus 2 in the work log DB).  
> On the **free plan**, review logs with the **work log** DB **Today** / **This Week** table views. For the full dashboard experience, **Notion Plus (paid) or higher** is recommended.

Template workflow:

1. Open [PomoNotion Dashboard (Minimal)](https://steady-lighter-6fe.notion.site/PomoNotion-Dashboard-Minimal-e88cd1874cd5837d9b19013da2c206e0?source=copy_link) and **Duplicate** it into your workspace
2. Follow steps **1–5** below (create Connect → connect DB → get database ID → configure Raycast)  
   See the duplicated **Getting Started** page for details
3. Confirm **Configure Notion** reports a successful connection

### 1. Create a Notion Connect integration

Issue an **access token** from Notion **Connect** (usually starts with `secret_…`).

**Recommended (browser)**

1. Open the [Connect management page](https://app.notion.com/developers/connections)
2. Click **+ New Connect**
3. Enter a **name** (e.g. `PomoNotion`), choose **access token** and **workspace**, then click **Create Connect**
4. Copy the displayed **access token**

**From the Notion app**

1. Sidebar **workspace name** (top) → **Settings**
2. **Connect** tab → **Create or manage Connect** at the bottom
3. Continue steps **2–4** in the browser [Connect management page](https://app.notion.com/developers/connections)

> Treat the access token like a password. Do not share it outside Raycast **Notion Token**.

Set this token as **Notion Token** in Raycast.

### 2. Prepare the work log database

**Using the template**  
Use the duplicated **work log** database as-is. Property names, types, and views are preconfigured.

**Creating manually**  
Create a new Notion database with at least these properties using **exact names and types**:

| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Filled automatically by the extension |
| `Start` | Date | **Include time: ON** |
| `End` | Date | **Include time: ON** |
| `Work Note` | Text | Work note (optional). Rich text also works |
| `Focus` | Select | Options `High` / `Medium` / `Low` |
| `Session Type` | Select | Register options matching session types below |
| `Time` | Number | Number, not Formula |

#### `Focus` (required options)

- `High`
- `Medium`
- `Low`

#### `Session Type` (extension defaults = Minimal template)

The extension manages session types in Raycast and writes them to `Session Type` on save.  
**Keep Notion Select options and extension session types in sync** (the extension does not auto-create Notion options).

Default session types (same in the template DB):

- `Main Work`
- `Writing`
- `Reading`
- `Admin`

To change them, update both **Pomodoro Status** → **Edit Session Types** and the Notion `Session Type` options.

### 3. Connect the integration to the work log DB

1. Open the **work log** database as a full page
2. Open **⋯** (or **Share**) in the top right
3. Choose **Add connections** and connect the Connect integration from step 1

Without this connection, saving will fail even with a valid token.

### 4. Get the database ID

Open the **work log** DB as a full page and copy the database ID (about 32 alphanumeric characters) from the URL.

- Use the **work log DB** URL (not Getting Started or Dashboard)
- Do not include anything after `?v=`
- After duplicating, each copy has its own ID — always copy from your DB

Set this value as `Notion Database ID` in Raycast.

### 5. Validate in Raycast

1. Open `Configure Notion`
2. Set `Notion Token`
3. Set `Notion Database ID`
4. Run **Validate Connection**
5. Confirm required properties exist with correct types
6. `Focus` and `Session Type` option warnings are **warnings only** — do not confuse them with connection failure

## How the `Time` property works

`Time` must be a **`Number` property**.  
The extension calculates active work minutes (excluding paused time) and writes the value directly — not via a Notion Formula.

| Property | Role |
|---|---|
| `Start` / `End` | Start and end timestamps |
| `Time` | Aggregated active work time in minutes (excluding pauses) |

Use it directly in Notion charts and dashboards.

## Privacy and data storage

| Data | Stored in |
|---|---|
| `Notion Token` / `Notion Database ID` | Raycast extension preferences only |
| Active session / timer state | Raycast on your Mac |
| Work logs (notes, focus, time, etc.) | Your configured Notion database |

No data is sent to the extension author’s servers.

## Known limitations

- **macOS only** (not available on Windows Raycast)
- Auto-pause on sleep wake is disabled — check **Pomodoro Status** after waking your Mac
- Timer completion timing may drift depending on Raycast / macOS state
- The internal command **Internal: Timer Elapsed** may appear in search results (you normally do not need it)
- On **Notion free plan**, the Minimal template **Dashboard (3 charts)** may not fully render due to chart limits (logging still works). See **Notion setup** → **Notion free plan and dashboard**

## Author and license

- **Kohinada Makoto** — [X (@pgp_workstyle)](https://x.com/pgp_workstyle)
- Raycast Store author ID: `hk_raycast`
- Extension source code: MIT License (Copyright (c) 2026 Kohinada Makoto)
- Bundled BGM: [Pixabay Content License](https://pixabay.com/service/license-summary/) (see **Bundled audio**)
