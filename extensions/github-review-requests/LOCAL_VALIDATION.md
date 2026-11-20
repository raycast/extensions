# Local validation

Run `npm run dev` and use **GitHub Review Requests (Local)**. No credentials are copied from another extension. Keep your existing extension installed so you can compare results. Background tracking defaults to off.

## Required manual checks before updating the PR

- [ ] On a fresh installation, configure authentication and open a view command. Verify My Pull Requests launches automatically. Disable the menu afterward and reopen a view; it should stay disabled. With the command disabled before first authentication, verify the one-time settings notification.

- [ ] From both menu layouts and Account & Data, open Authentication Method. Verify it shows the current selection and opens extension preferences; change PAT/CLI there and reopen the command to confirm the label updates.

- [ ] Run Configure Review Tracking → Show in Menu Bar and verify the GitHub icon appears.
- [ ] In both layouts, open each Configure Review Tracking submenu item and verify the correct screen or setting is selected.

- [ ] Select **GitHub CLI**, leave PAT empty, and verify the signed-in account.
- [ ] Verify a known private work PR from an SSO organization accessible through your CLI. Compare with `gh repo view YOUR_ORG/YOUR_REPO --json nameWithOwner`.
- [ ] Select **Personal Access Token** with an authorized PAT. Verify the original search, both menu layouts, tracking settings, and inbox. Set an invalid CLI path to confirm PAT mode does not depend on it.
- [ ] Leave PAT empty in PAT mode. Expect PAT setup guidance, not automatic CLI fallback. Restore your chosen method afterward.
- [ ] Select CLI mode with a nonexistent path while a valid PAT remains saved. Expect CLI setup guidance, not PAT fallback.
- [ ] Check an expired/restricted credential reports a useful error. A token with no access to a repository must not be treated as proof that the repository has no PRs.
- [ ] Inspect the original GitHub menu icon in light and dark macOS appearance.
- [ ] Confirm the original menu has owner groups, Wait For Merge, Wait For Change, Wait For Review, New Review Request, Recent, and Force Refresh. Open a PR and verify Recent records it.
- [ ] Search review requests and try an existing GitHub search qualifier. Verify opening and copying a PR URL.
- [ ] Switch My Pull Requests → Menu Bar Layout to Attention and replies. Check the same GitHub icon, reply deep links, overflow, count, and empty behavior. Switch back and verify the original layout.
- [ ] In Pull Request Attention, compare inline-thread, top-level-comment, and review-body reply signals against a test PR. Check ignored bot authors and longest-wait sorting.
- [ ] Open a PR detail, inspect its timeline, and test reply/resolve actions only on a disposable PR. These write to GitHub.
- [ ] Run Activity Inbox refresh once to establish a silent baseline. Arrange a new comment on a test PR; refresh and confirm one inbox event, correct deep link, and no repeat after another unchanged refresh.
- [ ] Enable Background Activity Tracking only when ready; verify it picks up a later test event. Enable notifications separately and check quiet hours and cap. Disable both after testing if unwanted.
- [ ] Restart Raycast and verify settings, recent history, and inbox persist with the same credential.
- [ ] Switch credentials or hosts, reopen commands, and check old PR data is cleared while tracking settings remain. The next activity check should establish a fresh baseline.

- [ ] Set Organizations/Owners to a personal account, an organization, and both. Confirm known PRs appear in classic and attention layouts. Choose Organizations → Search Everywhere, reopen both commands, and verify results are unrestricted even while the legacy preference remains populated.

## Current results

- 26 regression tests passed, including personal, organization, mixed, migrated, saved, and explicitly cleared owner scopes across classic and attention query paths.
- Typecheck, Raycast lint, and distribution build passed.
- Distribution build and generated TypeScript definitions validated; native Raycast interaction was not exercised in this revision.
- Native visual and real organization-access checks above remain pending.
- Automated checks ran with Node 22.22.2, matching the repository requirement.
- Read-only GitHub GraphQL checks confirmed `user:` returns personal and organization repositories and combines mixed owners as a union.

## Automated checks

On a clean checkout, run `npm run build` to generate the ignored Raycast types first. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. The tests exercise actual domain modules with a fake Raycast storage API, controlled HTTP responses, and a temporary fake CLI executable. They do not establish real organization access or prove native Raycast rendering.

Develop from `extensions/github-review-requests` in the Raycast extensions checkout. The original icon asset is unchanged. Generated `raycast-env.d.ts` definitions remain ignored.

## Limits to review

- Native visual behavior and actual PAT/SSO access require the manual checks above.
- Polling is a snapshot, not complete event delivery. Sequential repeated checks are tested; simultaneous watcher invocations can still race in local storage and potentially duplicate banners. Validate this before treating notification delivery as reliable under overlapping launches.
- Demo mode is inherited for the attention screens; the original search and original menu still query GitHub. Do not use demo mode as a guarantee that every command is safe for public screenshots.
- The isolated preview has separate preferences and storage from the Store extension.
