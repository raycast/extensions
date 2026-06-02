# Habitify Raycast Extension — MVP Plan

## Goal
Build a private Raycast extension that connects to Habitify v2 using an API key and lets me inspect today's habits, complete/undo habits, and inspect basic statistics.

## Scope
### In scope for MVP
- Store the Habitify API key in Raycast preferences.
- Fetch today's habit journal from `GET /habits/journal`.
- Show today's habits in a searchable Raycast list.
- Complete a habit with `POST /habits/{habitId}/logs/complete`.
- Undo today's log with `POST /habits/{habitId}/logs/undo`.
- Show a basic habit detail view with stats from `GET /habits/{habitId}/statistics`.
- Ship a README with setup and usage instructions.

### Out of scope for MVP
- Habit creation/editing.
- Area management.
- Notes.
- Archive/delete flows.
- Push notifications or sync automation.

## Repository structure
- `package.json` — Raycast manifest and scripts.
- `src/index.tsx` — main Today Habits command.
- `src/lib/habitify.ts` — typed Habitify API client.
- `src/lib/date.ts` — local date helper.
- `src/components/HabitDetail.tsx` — statistics/detail view.
- `assets/icon.png` and `assets/icon@dark.png` — extension icons.
- `docs/plan.md` — this document.
- `README.md` — setup and usage guide.

## Implementation tasks

### Task 1 — Scaffold the Raycast extension
- Create the Raycast manifest in `package.json`.
- Add commands/scripts for `ray develop`, `ray build`, and `ray lint`.
- Add a required password preference for `apiKey`.
- Add `assets/icon.png` and `assets/icon@dark.png`.

### Task 2 — Add the Habitify API client
- Implement a small fetch wrapper in `src/lib/habitify.ts`.
- Add request helpers for JSON GET/POST calls.
- Add typed methods:
  - `getTodayJournal()`
  - `completeHabit(habitId)`
  - `undoHabit(habitId)`
  - `getHabit(habitId)`
  - `getHabitStatistics(habitId)`
- Handle non-2xx responses with readable errors.

### Task 3 — Build the Today Habits list command
- Fetch the journal on launch.
- Render habits in a Raycast `List`.
- Show status, streak, and progress in each list item.
- Add actions for complete, undo, and open the detail view.
- Refresh the list after a mutation.

### Task 4 — Build the detail/statistics view
- Fetch the habit metadata and statistics.
- Show summary information in a Raycast `Detail`.
- Display completion counts, average, and recent daily progress.
- Add complete and undo actions from the detail view as well.

### Task 5 — Polish docs and release readiness
- Write a README with:
  - prerequisites
  - install steps
  - preference setup
  - how to run locally with Raycast
  - troubleshooting notes
- Verify `ray lint` and `ray build` pass.
- Commit everything and push the private repo to GitHub.
- Create a release tag once the build is green.

## Verification checklist
- [ ] `npm install`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Raycast shows the command locally in dev mode.
- [ ] API key is accepted in preferences.
- [ ] The list loads from `/habits/journal`.
- [ ] Complete/undo actions work and refresh.
- [ ] Detail view loads statistics.

## Release checklist
- [ ] Repo is private on GitHub.
- [ ] Main branch exists and is pushed.
- [ ] README is present and accurate.
- [ ] Build artifacts are not committed.
- [ ] A tagged release is created for submission.
