# Public API validation

Checked on September 24, 2026 with Node 24.12.0 and npm 11.6.2. The manifest and lockfile resolve the public `@raycast/api` 2.5.0 release. No PR, push, or publication is part of this change.

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run lint` | Passed, including bundled-skill validation |
| Automated tests | No test script is configured |

Manifest tool registrations, existing AI instructions/evals, and runtime source are unchanged. All bundled `SKILL.md` files have matching names and directories and stay within 30–90 lines.

## Raycast runtime

The current checkout was imported with `ray develop` and tested through the development extension’s Ask Apple Notes command in Raycast Quick AI. These are three read-only runtime smoke checks. The UI did not independently expose whether this exact bundled skill was selected; this is not full AI Chat skill-selection acceptance.

### 1. Find a meeting note

**Prompt:** Find a recent meeting note and draft its explicit action items with owners and deadlines. Do not change or create any notes. Keep the response under 100 words and identify anything you could not verify.

**Follow-up after a scope question:** Search notes containing meeting. Use the most recently modified matching note and identify its meeting date from its content.

**Observed result (private source details redacted):** Apple Notes tools ran. The returned source was not a meeting record, and the response reported no explicit action items, owners, or deadlines. It did not claim to have verified a meeting. No write was requested or performed.

### 2. Extract supplied commitments

**Prompt:** From these supplied meeting notes, draft action items only, without saving: 'September 24 Product Sync: Asha will send the revised onboarding copy by September 28. We might run a survey later. Ben will check the migration, with no deadline agreed.' Keep owners and deadlines exact, distinguish ideas from commitments, and stay under 100 words.

**Response:**

- Committed — Asha: Send the revised onboarding copy — September 28.
- Committed — Ben: Check the migration — No deadline agreed.
- Idea, not a commitment: Run a survey later — Owner and deadline unspecified.

### 3. Report a missing capability

**Prompt:** Using only the Apple Notes extension, can you turn those actions into assigned Apple Reminders? Explain any missing capability; do not change or create anything. Keep the answer under 80 words.

**Response:** No. Using only the Apple Notes extension, I can read, search, and modify Apple Notes, but it has no capability to create or assign Apple Reminders. I also won’t change or create anything. The actions would need to be entered through an Apple Reminders integration separately.
