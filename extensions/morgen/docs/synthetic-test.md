# Paced synthetic calendar test

Repeat the live workflow recorded in [live-testing.md](live-testing.md). This is a manual integration test against a real Morgen account through the installed Raycast extension. It creates one real event; mocked unit tests are separate.

## Preparation

1. Install dependencies with `npm ci`, then run `npm run dev`. Ensure Raycast launches this checkout's Morgen commands, not an older development copy.
2. Enter the Morgen API key in Raycast extension preferences. Never copy it into this guide, chat, logs, or screenshots.
3. Set **Calendar Scope** to the exact name of a user-approved personal or dedicated test calendar. Do not use a work calendar or leave the scope blank. Names must be unique across connected accounts for this test; stop if the scope selects multiple calendars.
4. Optionally set **Scoped Calendar Display Name** to `Personal`. This changes the displayed label, not the underlying calendar or its permissions.
5. Choose today's local date and a future start time with enough time to finish the test before the event starts. Use a one-hour duration and a unique title such as `Raycast test — Focus session — YYYY-MM-DD HHmm`. Record the machine's IANA timezone. The successful reference run used 21:00 in `America/Argentina/Cordoba`.
6. For the AI steps, use **Ask Morgen** or mention `@Morgen` in a fresh Raycast AI chat. Do not reuse a conversation containing unrelated scheduling instructions.

## Pacing and stop conditions

- Run one operation at a time. Wait at least **45 seconds after it finishes** before the next operation that contacts Morgen. Use this time to inspect results or take screenshots.
- This is the pacing used for the successful retest, not a documented provider limit or a guarantee against throttling. A single command/tool may make multiple requests internally (for example, calendars followed by events).
- Do not repeatedly reopen commands, run checks in parallel, or ask AI to retry. Typing a title filter in an already-loaded list is local filtering.
- On HTTP 429, stop live requests for this run. Honor a retry time if Morgen supplies one; otherwise record the failure and resume later. Do not probe repeatedly to discover whether the limit has cleared.
- A failed read means availability is **unknown**, not that the calendar is empty. The lists should show **Unable to Load Events**; the creation form should show **Unable to Load Calendars** on loading failure.
- If creation fails or its outcome is unclear, do not submit again. After the cooldown, inspect Morgen or perform one read-back for the unique test title before deciding whether another write is safe.

## Test sequence

### 1. Load the scoped calendar

Open **Create Event — Morgen**. Do not submit yet. Wait for loading to finish and inspect the Calendar dropdown.

Expected: only the approved writable calendar is available, with the `Personal` label if configured. Stop if it is missing, ambiguous, or a work calendar appears. Pause for at least 45 seconds.

### 2. Create exactly one event

Fill the form with the unique test title, today's date, the chosen future start time, one-hour duration, and the approved calendar. Inspect the fields before submitting once. There are no attendees.

Expected: the command reports success. Record any error instead of retrying. A success message alone is not the final verification. Pause for at least 45 seconds after completion.

### 3. Read back through Search Events

Open **Search Events — Morgen**, wait for loading, and filter by the unique test title.

Expected: exactly one matching event with the chosen date, local start time, one-hour duration, and scoped calendar label. Search covers upcoming events, so use a future start time. Pause for at least 45 seconds.

### 4. Read back through Today's Events

Open **List Today's Events — Morgen**, wait for loading, and filter by the same title.

Expected: the same event and start time/duration. If the date has rolled over, record that and rerun on a suitable date rather than treating the missing event as a failure. Pause for at least 45 seconds.

### 5. Check AI calendar listing

Send this prompt in the fresh Morgen AI chat:

> Run only List Calendars once to check my scoped calendar. Report the calendar count, display label, current local date, and timezone. Do not show addresses or IDs. Do not run other tools or retry errors; we are pacing requests.

Expected: the visible tool activity includes List Calendars, and the result reports exactly one approved calendar with the correct local date/timezone. Inspect actual tool activity, not just the assistant's claim. Pause for at least 45 seconds after the response finishes.

### 6. Check AI event read-back

Continue in the same chat. Replace every bracketed value below before sending. Use midnight today and midnight tomorrow with the correct UTC offset for each boundary; offsets can differ across a daylight-saving transition.

> Run Find Events exactly once, start [TODAY-T00:00:00-WITH-OFFSET], end [TOMORROW-T00:00:00-WITH-OFFSET], query [UNIQUE TEST TITLE]. Report the event title, stored start, timezone, duration, and whether an event ID is present. List Calendars was already verified separately; do not call it again. Do not retry, create anything, or reveal IDs or addresses.

For the original reference run, the bounds were `2026-10-01T00:00:00-03:00` and `2026-10-02T00:00:00-03:00`. Use the current test date, not these historical values.

Expected: visible Find Events activity and exactly one matching event with the chosen stored local start, IANA timezone, `PT1H` duration, and an event ID. Equivalent IANA aliases may be reported; the reference run listed `America/Cordoba` and returned the event timezone `America/Argentina/Cordoba`. No AI write is part of this sequence.

## Screenshots and evidence

Capture the populated creation form before submission and the filtered Search/Today results using Raycast's **Capture Window** command. Capturing an already-loaded view does not require another Morgen request. Use synthetic titles, the display label, and a clean background; inspect saved files for private data before committing. Save Store screenshots in `metadata/` as 2000×1250 PNGs. Seeing the capture preview is not proof the file was saved: check that it exists and opens correctly.

Append a dated result to [live-testing.md](live-testing.md) with:

- Tested commit, local date/timezone, pacing, and Raycast version when available.
- Pass/fail/not-run for each step and actual tool activity observed.
- Synthetic title, expected/stored start and duration, and presence of an event ID (not the ID itself).
- Any rate-limit or other error, without credentials, raw private payloads, addresses, or calendar IDs.
- Saved screenshot paths and whether the event was retained or cleaned up.

## Cleanup and coverage limits

The extension does not support deletion. Inspect the exact synthetic event in Morgen and remove it there if cleanup is authorized; never delete unrelated appointments. Otherwise leave it in place and tell the calendar owner its title and time. Check for duplicates before repeating the test.

This sequence validates UI creation plus UI/AI reads in the local timezone. It does **not** validate AI creation's manual confirmation dialog, cross-timezone display, DST edge cases, or failure UI under a newly induced outage. Record those as separate checks. Do not deliberately trigger rate limits to test the error UI; use the automated regression tests for that behavior.
