# Plugin bug fix: abort an interactive run promptly when the client's poll socket closes

Repo `/Users/christian/Developer/quickadd` (QuickAdd, pnpm, master at 42d5b04d or newer; read `AGENTS.md`). Own worktree under `/Users/christian/Developer/quickadd-worktrees/` on branch `fix/interactive-disconnect` off `origin/master`. pnpm binary: `~/.vite-plus/package_manager/pnpm/10.32.1/pnpm/bin/pnpm`. Note: `pnpm run build` currently fails at tsc on master because `tests/e2e/*` import `registerFailureArtifacts` from an `obsidian-e2e/vitest` that the local install lacks; run `pnpm install` first and see whether that resolves it; if not, say so and use `node esbuild.config.mjs production` for the bundle, and do not touch those tests.

## Symptom (reproduced from Raycast)

A Raycast extension drives a run through `quickadd:interactive`. When the user presses Escape in Raycast, Raycast closes the extension's in-flight `/poll` connection within 0.7 s (observed with `lsof`: the ESTABLISHED socket from the Raycast backend to the plugin's loopback port vanishes) and never polls again. The plugin's server (`src/interactive/interactivePromptServer.ts`, `handlePoll`) only drops the parked waiter in `res.on("close")` and relies on `pollWatchdog` (`POLL_TIMEOUT_MS` = 75 s) to abort, so a macro that is mid-work or waiting on a prompt keeps running in Obsidian for about 70 s and then ends with "The interactive client disconnected, so the run was ended." Tracked as https://github.com/chhoumann/raycast-quickadd/issues/7.

## Fix (root cause, server side)

When a parked long-poll's socket closes before the server answered it, the client is gone or reconnecting. Start a short disconnect grace (`DISCONNECT_GRACE_MS`, 3 s) at that point. A new `/poll` for the session cancels it (the extension re-polls within milliseconds after every answered poll, and React StrictMode's double mount re-polls just as fast, so 3 s never fires for a live client). If no poll arrives, finish the session exactly as the watchdog does (the existing disconnect error text) so the executor's pending prompt rejects and the run unwinds. Keep the watchdog for the case where the client dies between polls. Clear the grace timer wherever the session is finished or cleaned up, as `pollWatchdog` is. Model it as one more timer field on `Session` next to `pollWatchdog`; no new state machine.

Be careful that Node fires `res.on("close")` after a normal answered response too; the existing `session.waiter !== waiter` guard already distinguishes "we answered" from "client hung up mid-park". Only the hung-up path starts the grace.

## Tests

In `src/interactive/interactivePromptServer.test.ts` (follow its existing harness): (1) a parked poll whose socket is destroyed by the client, with no further poll, ends the session with the disconnect error after the grace and the pending prompt rejects; (2) the same, but a new poll arrives within the grace: the session stays alive and the new poll receives the next event; (3) an answered poll's close does not start a grace. Use fake timers if the file does. Each test must fail without the fix; say which assertion fails on the unfixed code.

## Live verification (mandatory, `verify-in-obsidian` isolated flow)

A small node script (keep it in your report, not the repo) that: starts `quickadd:interactive` for a macro that sleeps 6 s then calls `yesNoPrompt` (copy `/Users/christian/Developer/raycast-quickadd/e2e-vault/scripts/slow.js` and its choice from that vault's `data.json` into the isolated vault), issues one `/poll`, then destroys the socket (`req.destroy()`), and measures when the macro's abort marker appears. Expect under 5 s; report the measured number before and after the fix.

## Finish

`pnpm run test`, `pnpm run lint` green; bundle built. One Conventional Commit, `fix(interactive): abort the run when the client's poll socket closes`, no PR. Report branch, commit, test output tails, the measured abort latency before and after, anything not verified. No em dashes anywhere; use "-". Comments only for non-obvious why.
