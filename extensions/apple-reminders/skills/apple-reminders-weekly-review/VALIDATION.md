# Public API validation

## September 30, 2026 review fixes

Validated the fixes for all five Greptile findings on PR #31751. Missing list IDs now fail for both reminder readers, search rows clear while the query changes, reads wait for a 300 ms typing pause, and date search uses the English month names displayed in the UI.

| Check                                       | Result                                     |
| ------------------------------------------- | ------------------------------------------ |
| `npm test`                                  | Passed: 93 Node tests and 9 Swift tests    |
| `npm run lint`                              | Passed, including bundled-skill validation |
| `npx tsc --noEmit`                          | Passed                                     |
| `fallow dupes`                              | No duplicate groups                        |
| `npm run build`                             | Passed                                     |
| Month-search test with `-AppleLocale fr_FR` | Passed                                     |

`npm test` now runs both suites. Hook regression tests use the real Raycast query hooks with mocked native calls and an in-memory cache. They cover stale rows during typing, a list change or failure, and late responses during the debounce delay. Swift tests cover missing versus empty lists, smart views, and English month search alongside the existing result-limit regressions. Tests do not read or write the user's reminders. AI evaluations and interactive Raycast checks were not rerun for these review fixes.

## September 24, 2026 skill validation

Checked on September 24, 2026 with Node 24.12.0 and npm 11.6.2. The manifest and lockfile resolve the public `@raycast/api` 2.5.0 release. No PR, push, or publication is part of this change.

| Check           | Result                                     |
| --------------- | ------------------------------------------ |
| `npm run build` | Passed                                     |
| `npm run lint`  | Passed, including bundled-skill validation |
| `npm run test`  | Passed                                     |

Manifest tool registrations, existing AI instructions/evals, and runtime source are unchanged. All bundled `SKILL.md` files have matching names and directories and stay within 30–90 lines.

## Raycast runtime

The current checkout was imported with `ray develop`. Raycast AI Chat showed the registered Weekly Review and Action Capture skill in its picker. Three read-only prompts completed using Apple Reminders; selection of the exact skill was not independently confirmed. These are runtime smoke checks, not full skill-selection acceptance.

### 1. Weekly review

**Prompt:** Review my reminders for the past seven days and suggest three priorities for the next seven days. Use completed dates for completed work, distinguish overdue from upcoming work, and do not modify anything. Keep the summary under 150 words.

**Observed result (personal reminder details redacted):** Three Apple Reminders tools ran. The response separated recent completed work, overdue work, and upcoming deadlines, then proposed three priorities. It reported no completions during the requested period and no future-dated reminders. No writes were requested or performed. Returned account data was not independently audited for completeness.

### 2. Draft supplied personal actions

**Prompt:** Draft, without saving, reminders from these supplied meeting notes: 'I will prepare onboarding questions. Priya will review the launch brief next Tuesday. We might redesign the dashboard someday.' Create only a draft of my personal commitment, with no invented deadline or priority. Keep it under 80 words.

**Response:** Draft reminder: Prepare onboarding questions.

### 3. Report unsupported operations

**Prompt:** Using only the Apple Reminders extension, explain whether you can move overdue reminders to a new Next Week list and assign them to Morgan. Do not perform any changes; identify missing capabilities. Keep it under 80 words.

**Response:** Using only the Apple Reminders extension, I cannot complete this as requested:

- It can identify overdue reminders and retrieve available lists.
- It cannot move an existing reminder to another list; the update action has no `listId` field.
- It cannot assign reminders to Morgan; there is no assignee field or assignment action.
- It can create a new reminder in a specified list, but that would not move or assign the existing reminder.

The response correctly identified missing move and assignment support, but did not explicitly identify the missing new-list tool.
