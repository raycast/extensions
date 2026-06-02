# Habitify Raycast — UI Polish + New Commands Plan

## Document goal
Polish the current *Today Habits* experience so it feels more like a Raycast-native dashboard, then keep the command surface focused on the highest-value Habitify flows.

## Current state review
### What already works
- `Today Habits` loads from `GET /habits/journal`.
- Each item can be completed or undone.
- There is a detail view with stats.
- The extension already uses a password preference for the Habitify API key.
- The codebase is small and easy to extend.

### What feels basic or unfinished
- The Today list is functional but visually sparse.
- Completed vs remaining habits are not clearly separated.
- The list does not surface a high-level summary at a glance.
- Empty/error states are serviceable, but not polished.
- The extension only exposes a small set of commands, so the command palette surface can still be improved.

## Scope
### In scope for this iteration
1. Improve the *Today Habits* command UI.
2. Keep the existing commands lean and focused.
3. Keep the changes compatible with the existing Habitify API v2 client.
4. Reuse as much of the existing data-fetching layer as possible.

### Out of scope for this iteration
- Habit creation/editing flows.
- Full scheduling/calendar logic.
- Notifications or background automation.
- Deep analytics dashboards.
- Area editing or deletion.

## Proposed UI polish for Today
### 1) Add a compact summary header
Add a top section above the list with:
- total habits shown today
- completed count
- remaining count
- completion percentage

This gives the user instant context before scrolling.

### 2) Separate the list into meaningful groups
Split the list into sections such as:
- *Remaining*
- *Completed*

If Habitify statuses support more states, preserve them in a third section like *Other* or *Blocked*.

### 3) Improve list item hierarchy
For each habit item:
- make the primary title the habit name
- use the subtitle for progress text
- move streak/progress/status into accessories consistently
- keep the status icon visually dominant

### 4) Make actions more discoverable
For the `ActionPanel`:
- keep complete/undo as the primary action
- add `Refresh`
- add `Open Statistics`
- add `Copy Habit ID`
- optionally add `Copy habit name` or `Copy today status`

### 5) Upgrade loading, empty, and error states
- Loading state: show a friendlier message like “Loading today’s habits…”
- Empty state: show a short explanation and one clear retry action
- Error state: include a direct preference shortcut plus retry

### 6) Add visual polish to the detail view
In `HabitDetail`:
- add a small stats summary block at the top
- highlight active goal and current status
- group recent daily progress into a more readable layout
- make the markdown easier to scan with short labels and spacing

## Current command set
### `Today Habits`
Primary daily dashboard for completions, undo, and habit detail access.

### `Due Now`
Shows only habits scheduled for the current time of day.

### `Current Time of Day`
A focused view of the active time slot and its habits.

### `Habit Areas`
Browse habits by area.

**Purpose:**
- show each area and the habits inside it
- support quick access to related habits

**Best UI shape:**
- `List` of areas first
- push into a second `List` of habits for that area

**Value:**
- adds structure for users who organize habits by life domain

## Recommended implementation order
### Task 1: Polish the Today Habits screen
**Objective:** Make the current command feel complete and polished without changing its purpose.

**Files likely touched:**
- `src/index.tsx`
- `src/components/HabitDetail.tsx`
- `src/lib/habitify.ts` if a new helper is needed
- `src/lib/date.ts` if summary dates need formatting helpers

**Changes:**
- add summary counters
- split items into sections
- improve item accessories and subtitles
- refine empty/error states
- tune ActionPanel ordering

### Task 2: Add a reusable Habit list model
**Objective:** Avoid duplicating rendering logic across Today / Due Now / Areas.

**Files likely touched:**
- `src/lib/habitify.ts`
- `src/lib/transformers.ts` or similar new helper file

**Changes:**
- normalize Habitify responses into a simpler view model
- derive labels like status, streak text, progress text, and sort order

### Task 3: Keep `Habit Areas` polished
**Objective:** Let the user browse habits grouped by area.

**Files likely touched:**
- `src/areas.tsx`
- `src/lib/habitify.ts`
- `package.json`

**Changes:**
- fetch `/areas`
- render area list
- push into habits within an area

### Task 4: Consider `Weekly Statistics` later
**Objective:** Provide a second stats surface that is broader than a single habit.

**Files likely touched:**
- `src/weekly-statistics.tsx` or similar new command file
- `src/lib/habitify.ts`
- `package.json`

**Changes:**
- decide whether stats come from existing habit endpoints or require aggregation
- show a concise trend-focused summary

## Suggested command set for MVP v2
If the goal is the best balance of value and effort, keep the focus on:
1. `Today Habits`
2. `Due Now`
3. `Current Time of Day`
4. `Habit Areas`
5. `Weekly Statistics` — optional if the API data supports it cleanly

## Verification checklist
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Raycast shows all commands in dev mode
- [ ] Today list has clear summary + grouping
- [ ] Complete/undo still work after UI changes
- [ ] Areas command loads data correctly
- [ ] Detail view remains accessible from every entry point

## Recommendation
Start with *Today Habits polish* plus *reliability hardening*.
That keeps the daily workflow fast while avoiding command-bloat.
