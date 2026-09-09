# Release checklist

## Current verification

- Raycast username `leo66` verified in the app.
- English-only Store source prepared; 35 tests, TypeScript, lint, and build passed.
- Three native Raycast Window Capture screenshots (2000 × 1250 PNG) are in `metadata/`. They use an isolated fake AWS CLI and fictional profiles; no production AWS data is included.
- Real browser reauthentication and a timed native background-refresh check still need the maintainer's manual verification before submission.

## Local manual verification

1. Run `npm ci` and `npm run dev` with Raycast installed.
2. Open AWS SSO Status. Check a modern profile, a legacy profile, and multiple profiles. Inspect all metadata and copy only profile/account identifiers.
3. Run AWS SSO Menu Bar. Enable Background Refresh. Verify the title updates after at least one minute and the loading indicator completes.
4. Test time-only and simple ✓ / ✕ modes (cloud icon, no profile prefix), all five languages, localized error/login messages and dates, all warning thresholds, filtering, and primary selection (including a missing/filtered primary).
5. Point AWS CLI Path to a nonexistent absolute path. Verify AWS CLI Not Found in both commands, then restore the preference.
6. In an isolated development environment, point AWS_CONFIG_FILE to a temporary missing or malformed config. Check the empty/error state. Do not change your real config for testing.
7. With a signed-out test profile, check Not Signed In. Trigger Sign In in both commands, complete browser authentication, and verify refreshed credential expiration. Confirm the menu action completes after the menu closes.
8. Test an expired credential response with a fake CLI and verify Expired; test a hanging CLI and ensure loading ends. Do not tamper with the actual SSO cache.
9. Cancel browser login or let it time out. Check the sanitized failure Toast and subsequent refresh.
10. Verify Open AWS Console opens only the test access portal. Check issuer URL configurations gracefully omit this action.
11. Run AWS SSO Login with no argument, a chosen profile, and an invalid/filtered profile. Verify browser login, sanitized failures, and post-login credential checks.
12. Verify the public GitHub URL in `src/project.ts` and the voluntary Star link; check that it opens the repository only on click.
13. Inspect in Raycast light and dark appearance and on a crowded menu bar.

## Before Store submission

- Raycast account username was verified in the app as `leo66`; the manifest author matches.
- GitHub and CI are already public. Keep build outputs and AWS data out of commits.
- Review the diff and screenshots for real AWS metadata. All examples must remain fictional.
- Public repository and private security reporting are configured.
- The public source repository is https://github.com/burger66leo/raycast-aws-sso-status. Raycast Store submission remains a separate step.

## Raycast Store submission

Follow the current [Store preparation guide](https://developers.raycast.com/basics/prepare-an-extension-for-store) and [publishing guide](https://developers.raycast.com/basics/publish-an-extension).

1. Use this English-only `store-submission` branch. The main branch retains the multilingual UI.
2. Confirm the manifest author is your real Raycast account, command descriptions, macOS platform, MIT license, categories, and 512×512 PNG icon.
3. Complete the native manual checks above. Capture actual Raycast screenshots with fictional test profiles (three recommended, 2000 × 1250 PNG); do not fabricate screenshots as proof of execution.
4. Include README, changelog, license, source, assets, and lockfile. Keep `{PR_MERGE_DATE}` in the initial changelog entry for the Store workflow.
5. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` without suppressing rules.
6. Run `npm run publish` when ready and follow Raycast's login/submission workflow. This opens a PR to the Raycast extensions repository; it does not guarantee Store acceptance.
7. Explain why AWS CLI is required, what data is read, why credential expiration is not an SSO reauthentication deadline, and how reviewers can test using a fictional config and their own SSO environment.
8. Address reviewer feedback and wait for approval. Keep the standalone repository and Store copy synchronized for later updates.

## Reliability acceptance cases

- Open and reopen the menu within a minute: retain the prior title and avoid an AWS credential subprocess.
- Switch primary profile in the menu, reopen both commands, and verify quick login uses that selection. Reset to the preference default.
- With a fake CLI, establish a successful check, then simulate network failure: retain Last Successful Check, mark stale, and show the next retry. Manual Refresh bypasses backoff.
- Start checks or logins from two commands against the same session: only one browser login runs; each account/role is still independently checked.
- Enable Sign-In Reminder and simulate a successful session becoming login-required: receive one reminder. No repeated notification until recovery and another sign-out. Disabled reminders and first-run signed-out states stay quiet.
- Open Diagnostics and inspect config path, CLI path/version, and counts. Do not publish real diagnostic paths or AWS metadata.
