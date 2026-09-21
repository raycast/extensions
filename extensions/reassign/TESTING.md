# Local verification

Nothing should be pushed or marked ready for review until the live checks below pass.

## Automated checks

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
The tests cover duration preservation, overnight ranges, refresh failures, shared
OAuth credentials across isolated command modules, logout during login, failed
form submissions, Now's sign-in action, Inbox pagination, feedback requests, and
nested scheduling receipts. OAuth and UI tests use mocked Raycast APIs; they do
not replace a live OAuth callback or UI test.

`npm run dev` registers the development extension in Raycast and watches local
changes. Before final review, stop development mode, run `npm run build`, and
repeat the live checks with that distribution build.

## Live checks — pending

Use a test account and remove or undo any blocks created during testing.

- Open Agenda while signed out. Confirm Raycast's native OAuth prompt opens,
  consent returns to Raycast, and the plan loads.
- Enable Now. Log out from Agenda and Inbox. Neither should open OAuth again;
  refreshing Now must stay signed out. Now's Sign In action should open Agenda.
- Schedule `deep work tomorrow 9am-11am`: the duration must be two hours both
  in the form and in Reassign. Repeat with `work tomorrow 11pm-1am`.
- Schedule a flexible block, such as `writing tomorrow for 90m`. Verify
  proposal selection, calendar assignment, and Undo.
- Save a bare idea, schedule it from Inbox, then undo/remove it. Verify that an
  Inbox with over 50 items shows later items too.
- Edit and move a block. Force a failed request (for example, disconnect the
  network) and verify entered fields stay in place in edit, move, and Inbox forms.
- Verify check-off, shift, delete/Undo, search, calendar mirrors, and meeting links.
- Verify Now with block names hidden and shown; verify opt-in notifications.
- Test feedback validation locally; submit real feedback only when intended.

## API alignment

Checked the current `../reassign` route handlers, OAuth client registry, request
schemas and response serializers, and the deployed public
[OpenAPI schema](https://reassign.app/api/v1/openapi.json).

The extension's OAuth client, web redirect, resource audience and event scopes
remain supported. Schedule, event writes, search, calendars, Inbox mutations,
plan/confirm and Undo use the existing public API. No backend edits are required
for the reviewed workflows. Compatibility fixes in this extension handle:

- `nextBacklogOffset` pagination (50 Inbox items per schedule response).
- Required feedback `kind` (`bug`, `idea`, or `other`).
- Plan/confirm outcomes inside `results[].result`, with numeric `committed` counts.
- Active trials as well as Pro subscriptions in the documented requirements.

The SDK is `@raycast/api` 2.4.1; the installed app is Raycast 2.4.1.
The [OAuth docs](https://developers.raycast.com/api-reference/oauth) still recommend
the web redirect used by the backend registry. Production authenticated calls
and the browser callback remain part of the pending live checks.

## Five-command layout and AI — live checks pending

- Confirm Agenda, Add Block, Inbox, Search Blocks and Now appear in Raycast.
  A fresh Agenda defaults to today; an explicit week choice persists.
- Launch Search Blocks with and without a query. Verify the native OAuth flow
  when signed out, search results, and the existing Agenda Command-F action.
- In Add Block, Enter saves a bare idea to Inbox. Set a start or duration and
  verify Schedule or Find a Time becomes primary. Clear them and verify capture is primary again.
- Expand details in Add Block and Edit Details, enter notes and calendar targets,
  collapse details, then save. Verify hidden values are preserved.
- Fill with AI: describe one block, inspect the preview, accept it into the form,
  then edit and save. Verify no block is created by Suggest or Use Suggested Block.
- Try an overnight AI suggestion and an Inbox suggestion with a duration. Try
  a multi-block or recurring request: unsupported suggestions must not be filled.
- Change the description while AI is loading: the old response must not replace
  the current description's draft. AI errors must leave manual entry available.
- Save from the compact form and from a flexible scheduling proposal. Both should
  return to Raycast root after success, while a failure should keep the draft.

- Type only a date in the native Start picker: this must remain an Inbox idea, not create an
  event at midnight. A scheduled event requires a concrete date and time.
  Duration-only scheduling must show concrete time proposals before confirmation.

- Type “tomorrow at 10am” in Start and a later date/time in End. Duration should
  disappear, and the preview/save must use the picked range. Clear either boundary:
  Duration should return with the previous range's length. With only End plus a
  duration, verify the calculated Start. Explicit midnight must remain a timed
  event; a date-only picker value must never silently become midnight.
