# Azure DevOps Sprint Planner (Raycast)

A Raycast extension for Azure DevOps: see your current-sprint work items, your own done/total progress, and a day-by-day to-do generated from the sprint duration — check items off as you go, with an optional push back to ADO.

<img width="1000" height="625" alt="Raycast 2026-07-23 at 21 28 13" src="https://github.com/user-attachments/assets/fc9bea81-16ed-43db-af78-d290174dbb44" />


## Commands

- **My Sprint** — your work items in the ongoing iteration, grouped into "In Progress / To Do" and "Done" **by your local status**, with your personal `done/total` in the title. Each row shows a muted ADO-state tag and a color-coded local-status tag. Land on a row and press **`Tab`** to set status; other actions: open in ADO, copy, mark done in ADO (⌘⇧P).
- **My Tickets** — every **open** work item assigned to you across the whole project, regardless of sprint or team, grouped by iteration path, with a **Deferred** section at the bottom. Press `Tab` to set status, **⌘D** to defer / un-defer. Closed/resolved/completed items are filtered out.
- **Plan Sprint** — sequences your open work into a rolling queue and projects it across the sprint's remaining working days (`Daily Capacity` items/day). By default it plans your **current sprint _plus_ your other open assigned tickets** (backlog, tagged **Backlog** and ranked behind sprint work) so nothing outside the sprint rots — toggle **Include Backlog** off for sprint-only. Shows a **fit summary** (does it all fit, with how much buffer) and an **"At risk of spillover"** section for anything that won't — with one-tap **Defer**. Actions: **Save Plan**, **Do Next** (bump to front), **Re-Plan (Smart)**, **Re-Plan with AI**, Defer. Nothing is dumped onto the last day.
- **Today's To-Do** — the first day's slice of the projection. Because the plan is a rolling queue (not fixed dates), **unfinished work automatically rolls into today** — you never strand items on a past date. Set status with **`Tab`** (⏎ opens it in ADO), or **Also Push to ADO** (⌘⇧P).
- **Sprint Glance** — a menu-bar item showing how many items are left today; click any to open it, or jump into the Today / My Sprint views.

### Planner modes: Deterministic vs Auto (AI)

Plan Sprint can sequence your queue two ways:

- **Deterministic** (default, offline) — a fixed rule: finish in-progress work first, then by priority (P1→P4), then Bug → Story → Task. Reliable, no network, no data leaves your machine.
- **Auto (AI)** — with a **Gemini API key** set, **Re-plan with AI** asks Gemini to sequence smarter (dependency- and grouping-aware). The AI only decides the *order*; all the guardrails — capacity, fit, the "at risk" overflow, and rolling — stay deterministic, and its output is validated against your real work items (it can't invent or drop tickets). No key, or a failed call, falls back to the deterministic order automatically.

Get a free Gemini key from [Google AI Studio](https://aistudio.google.com/apikey) and paste it into the **Gemini API Key** preference. **Privacy:** Auto mode sends your work-item titles + metadata to Google when you re-plan; Deterministic mode never makes any network call beyond ADO.

### Local status & deferring

Every item carries a personal 3-stage **local status** (Not Started → In Progress → Done) stored only in Raycast — this, not ADO's state, drives your progress count and planning. Set it via the `Tab` dropdown. You can also **defer** an item (⌘D in My Tickets) to shelve it from all planning views; it stays visible under "Deferred" and can be restored anytime. Neither touches ADO.

## Setup

1. **Get a PAT.** In ADO → User settings → Personal access tokens → New Token.
   - Scope **Work Items: Read** is enough for viewing and planning.
   - Add **Work Items: Read & Write** only if you want the "push to ADO" actions.
2. **Install & run:**
   ```bash
   npm install
   npm run dev      # ray develop — hot-reloads while you build
   ```
3. **Fill preferences** on first run: PAT, organization (e.g. `contoso`), project, team, done state, daily capacity.

## Config notes

- **Open vs. closed items** are filtered automatically: the extension reads your process's state *categories* from ADO and shows only "open" ones (Proposed / In Progress), hiding Closed, Resolved, Completed, Rejected, Removed — whatever your process names them. This list is cached for a week.
- **Extra Open States** (default `Failed`) — a comma-separated list of states to keep visible even if ADO categorizes them as terminal. Failed work needs rework and isn't really "done", so it stays in your views; add any other rework/reopened states your process uses.
- **Done state** varies by process template — Agile uses `Closed`, Scrum/Basic use `Done`. It's now only the **write-target** for "Mark Done in ADO" / "Also Push to ADO" and a **fallback** filter if the automatic category lookup can't run, so set it to match yours.
- **`@CurrentIteration`** is resolved in *team context*, so the **team** you set is what defines "this sprint". Get the team right and the current iteration follows automatically.
- **Daily capacity** is items-per-day for the plan. Anything beyond `capacity × remaining days` is surfaced as **"At risk of spillover"** (never dumped on the last day) — defer it or raise the capacity.
- **Include Backlog** (default on) — plan your open tickets from outside the current sprint too, so they get worked and closed. They rank behind sprint items and are tagged **Backlog**. Turn it off for a sprint-only plan.
- **Planner Mode / Gemini API Key** — leave on Deterministic for offline planning, or switch to Auto (AI) and add a Gemini key (see below).

## What's local vs. what touches ADO

The daily plan, your **local status**, and your **deferred** shelf all live only in Raycast's local storage — a personal layer over ADO. Nothing writes to a work item unless you explicitly use **Mark Done in ADO** or **Also Push to ADO**.

## Where to take it next

- Add **story-point** capacity instead of item counts.
- **Parent-child clustering** — group a story's tasks/bugs together (needs an ADO relations fetch; also sharpens AI grouping).
- Add a **Detail** view (markdown) for a ticket's description + acceptance criteria.
- Reuse the auth/fetch pattern to add PR or build views later.
