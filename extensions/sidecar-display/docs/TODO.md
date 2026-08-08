# TODO

Outstanding work on Sidecar Display. Most of it is gated on the Raycast Store
review; the rest is optional polish and ongoing maintenance.

Status at time of writing (2026-08-05): submitted to the Store as
[raycast/extensions#29572](https://github.com/raycast/extensions/pull/29572),
open with all checks green. The PR carries `cd69d41` — the native-only rework and
the transport policy — which is **3 commits past the `v1.0.0` tag (`7ebf564`)**,
so the tag no longer marks what is under review.

---

## 1. When the Store PR merges

These can only be done once the extension is live on the Store.

- [ ] **Set the repo Homepage URL** to the Store listing:
      `gh repo edit chiptoma/sidecar-display --homepage "https://www.raycast.com/chiptoma/sidecar-display"`
- [ ] **Update the README "From the Raycast Store" section** — replace
      "Not yet published…" with the real install: the listing link plus the
      `raycast://extensions/chiptoma/sidecar-display` deep link.
- [ ] **Re-cut `v1.0.0`** at the merged commit. The tag (`7ebf564`) is already 3
      commits behind what is under review, so this is now required rather than
      conditional. (Delete + retag; `release.yml` re-cuts the Release.)

## 2. Before the reviewer arrives

- [ ] **Re-shoot `metadata/sidecar-display-3.png`** (and `media/preferences.png`).
      Both still show the removed **Engine** dropdown and the superseded extension
      description, against a manifest that now has 7 preferences. `metadata/` is
      the Store gallery, so a reviewer comparing it to the manifest sees an
      advertised setting that does not exist — the likeliest change-request.
      Preflight only validates dimensions (2000x1250), not content, so it passes.
- [ ] **Use the built extension for a day** (`npm run dev`). Nothing in `cd69d41`
      has run in a live Raycast session — auto-reconnect, the menu-bar refresh,
      the HUDs and the transport tooltips are verified only as logic and
      simulations. Every serious defect found so far surfaced from real use, not
      from tests or review: the `-501` banner storm, the stale menu bar, and
      BetterDisplay being cold-launched every 30s while closed.
- [ ] **No outside review yet.** Greptile has run twice since and posted nothing
      new; its only review (2026-07-19) describes the original submission. The
      presence probe, the transport policy and the native-only rework have been
      seen by nobody outside this repo.

## 3. While the PR is in review

- [ ] Watch #29572 for reviewer comments (first contact usually within a week;
      up to ~15 business days).
- [ ] If changes are requested: adjust → `npm run publish` (updates the PR). If
      the reviewer pushed commits to the PR first, run
      `npx @raycast/api@latest pull-contributions` before re-publishing.
- [ ] Keep it moving — the PR goes **stale at 14 days**, **auto-closes at 21**
      days of inactivity. Closed PRs can be reopened.
- [ ] _(Optional)_ Add a **screencast** to the PR description — a short recording
      of Connect + the menu-bar toggle can accelerate review for a
      display-manipulating extension. Needs the iPad on hand.

## 4. Optional enhancements (deferred, not blocking)

- [ ] **`readSnapshot()` on `SidecarBackend`.** The per-property interface does
      ~2 engine reads per converge tick (`readMirror` + `isIpadMain`); a single
      snapshot method would halve the CLI/Swift calls. Interface change; low
      priority. (Flagged as S3 in the smell scan.)
- [x] **Confirm the presence probe against the real undock/sleep scenario.**
      Confirmed 2026-07-31 at real distance: reports absent correctly. It also
      surfaced that "away" has two shapes — radios off keeps the device listed
      with bit 9 clear, while out-of-range drops it from the list entirely, which
      made auto-detection throw and killed the whole tick. Fixed by remembering
      the auto-detected name (`loadConfig`).
- [ ] **Explain the 31 Jul bits-2/24 sample.** Those bits track the cable (two
      clean plug/unplug cycles, 2026-08-05) and now back the "Cable only"
      option — but one earlier sample had them set with no cable knowingly
      attached. If something else can set them, "Cable only" will occasionally
      connect when not plugged in, which is what it exists to prevent.
- [ ] **Watch the probe across macOS updates and other hardware.** Bit 9 is
      undocumented and confirmed only on macOS 26.6 with one iPad. Two symptoms
      to watch for: banners piling up again (reads present when the iPad is gone)
      or auto-reconnect never firing on return (stuck absent — the hourly recheck
      caps the damage at one attempt/hour). Re-sample with a probe that dumps
      `SidecarDevice.status` if either shows up.
- [ ] **Auto-reconnect "reset to default" affordance.** The menu-bar toggle
      writes a LocalStorage override that supersedes the preference permanently
      once used. A menu item to clear the override (fall back to the preference)
      would round out the UX. (Noted in review as an accepted trade-off.)

## 5. Post-launch maintenance

- [ ] **Native engine / macOS updates.** `SidecarCore` is a private Apple
      framework reached via `dlopen`. Re-validate the selector set in
      `swift/Sources/Sidecar/SidecarBridge.swift` after each major macOS release;
      if it breaks, patch the Swift — there is no longer a fallback engine.
      Record the last-validated macOS version in the README.
- [ ] **Keep `@raycast/api` current** — Dependabot opens weekly PRs; staying
      current is a Store requirement, not just hygiene.
- [ ] **Toolchain pins.** `typescript` is held at `~6.0.3` and `@types/node` at
      `22.x` for peer/runtime compatibility (see [WORKFLOWS.md](./WORKFLOWS.md)
      and the project `CLAUDE.md`). Bump only when Raycast widens its peer
      ranges / the engines field.
- [ ] **Swift dependencies** are not covered by Dependabot — bump
      `swift/Package.swift` by hand and commit the regenerated
      `swift/Package.resolved`.
