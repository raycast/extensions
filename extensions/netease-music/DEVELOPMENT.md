# NeteaseMusic Development

## Local testing

Run these commands from the `extensions/netease-music` directory after installing dependencies with `npm ci`.

```sh
npm test
npm run lint
npm run build
npm run dev
```

The development command imports the local extension into Raycast and watches for changes. Use its development commands for the following checks.

1. Quit NeteaseMusic completely, run Play, and confirm that the app launches and plays the selected track.
2. Quit NeteaseMusic again, run Next Track, and confirm that the app launches and advances the queue.
3. Keep NeteaseMusic running in the background and check Play, Pause, Toggle Play/Pause, Next Track, and Previous Track.
4. Run Play twice and confirm that playback continues. Run Pause twice and confirm that playback stays paused.
5. Check the volume, lyrics, and track preference commands with the app running.
6. Run Dislike Track & Next Track and confirm that it performs both actions and shows one completion message.

The automated tests cover command execution and error handling. Actual app startup, menu availability, playback, and macOS permissions require these manual checks.

Local manual testing confirmed that commands automatically open NeteaseMusic when it is closed.

## Iteration log

## [Fix App Startup and Playback Commands] - {PR_MERGE_DATE}

This iteration was prepared on 2026-11-10. The plan was to handle app startup and remove the controller's one-second timeout.

- Commands now launch NeteaseMusic when needed and wait for its controls before acting.
- The extension now uses a shared AppleScript runner with a 30-second timeout instead of the previous controller dependency.
- Toggle Play/Pause now shares the same error handling as the other commands.
- Permission and timeout errors now show actionable failure messages.
- Regression tests and local Raycast testing instructions now cover the updated command path.

Five automated regression tests, TypeScript checks, Raycast lint and build checks, and AppleScript compilation passed. Actual playback and startup behavior remain pending manual testing in Raycast.

## [Name Completed Commands in Success Messages] - {PR_MERGE_DATE}

This iteration was prepared on 2026-11-10. The plan was to replace the generic success message with the executed command's title. Each command now reports its own title, and the existing Play regression test checks the displayed message. Wei confirmed that commands automatically open NeteaseMusic during local manual testing.

Submission checks on 2026-11-10 passed all five regression tests, TypeScript checks, Raycast lint and build checks, and formatting checks. The submission includes only the app startup fix, shared timeout and error handling, command-specific feedback, and supporting tests and documentation.

Upstream synchronization on 2026-11-10 preserved the existing Dislike Track & Next Track command and dependency security updates. The compound command now uses the shared runner and reports one completion message. All seven regression tests, TypeScript checks, Raycast lint and build checks, and formatting checks passed after installing the synchronized lockfile dependencies.

## Review follow-up on 2026-11-10

The plan is to consolidate the Store changelog, move development instructions out of the Store README, and use the official Raycast script and failure-toast helpers while preserving the 30-second timeout and existing command behavior. The existing development and validation notes above are preserved for handoff.

The Store changelog now has one new entry at the top, and the README contains only user-facing setup and behavior. The shared runner now uses `runAppleScript` and `showFailureToast` from `@raycast/utils`. The utilities use their stable 1.x release line with the minimum compatible Raycast API version, which avoids requiring a React 19 migration for this fix.

All seven regression tests, TypeScript checks, Raycast lint and build checks, and formatting checks passed. A harmless AppleScript smoke check verified argument passing and the official helper's `timedOut` error flag. Actual playback has not been retested after the helper migration.
