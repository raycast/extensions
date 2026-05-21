# Google Tasks Changelog

## [Natural Language Date Input] - {PR_MERGE_DATE}

- Replaced calendar date picker with a natural language text field in all task forms
- Supports 6 languages: English, French, German, Spanish, Portuguese, and Italian
- Live feedback: "Recognized: Thursday, May 28, 2026" appears below the field when a date is understood
- Unrecognized input shows a red "Date not recognized" error directly under the field
- Edit Task pre-populates the due date field with the existing date as readable text
- Added `src/date-parser.ts` utility module with `parseNaturalDate()` backed by chrono-node
- Added Vitest test suite (36 tests) covering all 6 languages, edge cases, and guard cases

## [Fix Timezone and Form Bugs] - {PR_MERGE_DATE}

- Fixed off-by-one day error in due date display for UTC- timezones
- Fixed overdue comparison using UTC midnight instead of local midnight
- Fixed task list dropdown submitting empty on first use in Create Task form

## [Address PR Review Feedback] - {PR_MERGE_DATE}

- Fixed bug where clearing task notes on edit was silently ignored (empty string was dropped from PATCH body)
- Use auto-generated `Preferences` type instead of manual inline type annotation in `oauth.ts`
- Remove hardcoded `"en-US"` locale from date formatting
- Switch ESLint config to use `defineConfig` from `eslint/config`
- Regenerate `package-lock.json` to remove stale `node-fetch` dependency

## [Improve Onboarding] - {PR_MERGE_DATE}

- Rewrote README with step-by-step OAuth setup including consent screen and test user configuration
- Added troubleshooting table for common setup errors
- Added first-launch guidance (what to expect after entering the Client ID)
- Fixed README title to match extension name (Google Tasks Manager)
- Added metadata/ folder for Raycast Store screenshots
- Improved preference description to reference README

## [Add Project Plan and Fix Plan Gaps] - {PR_MERGE_DATE}

- Added PLAN.md with full architecture, UI mockups, implementation details, and testing plan
- Added empty state view for the task lists screen when no lists exist
- Switched form validation to `useForm` with `FormValidation.Required` for inline field-level errors

## [Initial Version] - {PR_MERGE_DATE}

- View all Google Task lists
- Browse tasks within a list with filtering (Open, Completed, All)
- Create tasks with title, notes, and due date
- Complete and reopen tasks
- Edit task title, notes, and due date
- Delete tasks
- Visual indicators for completed and overdue tasks
- Google OAuth authentication via Client ID
