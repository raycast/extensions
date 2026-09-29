# Input Lock

A local Raycast MVP that blocks typing and clicks while keeping the current desktop visible and scrolling available. Tap either or both Command keys three times within 1.5 seconds, then use Touch ID to unlock. Hold both Command keys for 8 seconds to unlock without authentication if recovery is needed.

This is a temporary input guard. Anyone who knows the recovery gesture can unlock it. Use the macOS lock screen to protect private data.

## Use

Requires macOS 13 or later, Raycast, and an enrolled Touch ID fingerprint.

1. Run **Lock Inputs** in Raycast, select a duration, and press Enter to lock immediately. The Raycast window closes and the desktop stays visible.
2. To unlock, tap either or both Command keys three times within 1.5 seconds and touch the sensor when macOS prompts. Holding both keys continuously for 8 seconds is the recovery route.

Choose **10 minutes**, **30 minutes**, **60 minutes**, **2 hours**, **5 hours**, or **Indefinitely** for each session. Timed sessions unlock automatically when their duration ends. The timer starts when input blocking begins.

**Indefinitely** has no duration limit. If Command-key detection fails while the worker remains responsive, automatic health recovery will not detect that failure. Choose a timed session when you need a recovery route independent of the keyboard gesture.

Assign a hotkey in Raycast Settings → Extensions → Input Lock → Lock Inputs.

The installed extension works with the development watcher stopped. The user confirmed physical typing and pointer blocking, scrolling, and Touch ID unlock on the previous local build. The recovery checks below distinguish that hardware observation from the new supervisor checks.

### Permissions

- **Accessibility:** allows the active event tap to suppress keyboard and pointer events.
- **Input Monitoring:** allows the helper to detect the unlock gesture.

On first use, macOS requests the required permissions. If either permission or Touch ID is unavailable, the command refuses to lock. Grant permissions in System Settings → Privacy & Security, then run the command again. macOS may attribute the helper's request to Raycast. Permission behavior on a fresh Store installation and after a Store update has not been verified.

## Build and run

Requires Node.js. The committed native helper supports command development without a Swift toolchain. Changes under `native/` require Apple's Swift command-line tools and an explicit rebuild before running, packaging, or publishing. End users receive the native helper in the extension assets; there is no separate Mac application.

```sh
npm ci
npm run dev
```

If the selected Xcode installation has an unaccepted license while Command Line Tools are installed, use a per-command override:

```sh
DEVELOPER_DIR=/Library/Developer/CommandLineTools npm run build:native
```

The build script compiles the native sources for arm64 and x86_64, combines both into `assets/input-lock`, and applies an ad-hoc code signature. It uses only Apple frameworks. The extension-owned runtime makes no network requests and contains no telemetry code. This is a source observation; it has no network sandbox. The executable is committed alongside its source and build script because Store CI builds the Raycast command directly.

```sh
npm run build
npm run lint
npx tsc --noEmit
node scripts/check-command.cjs
python3 scripts/check-native.py
./assets/input-lock --self-test
./assets/input-lock --probe
```

## Technical scope

The Raycast command awaits a guardian process for the entire lock session. The same executable starts an input worker that owns the session event tap, idle display and system sleep assertions, the unlock gestures, and Touch ID authentication. JSON lines on stdout report `ready`, `preparing`, `locked`, `unlocking`, and `error` states. Heartbeats and control messages remain private between the two native processes. An OS file lock prevents nested lock sessions.

The guardian arms monitoring before input blocking starts. The worker sends main-loop progress every second. Five seconds without progress, the selected duration ending, or the Raycast parent exiting triggers recovery. The guardian requests release, then force-terminates its owned worker after one second if necessary. It confirms worker termination before reporting recovery. The worker's PID remains reserved until it is reaped, preventing escalation from targeting a reused PID.

| Input or behavior | Implementation | Validation |
| --- | --- | --- |
| Built-in and external keyboard key events | Suppressed by `CGEventTap`; Command flags still feed the unlock detector | User confirmed local typing blocked and Touch ID restored input; external-device and full shortcut matrix pending |
| Trackpad taps and clicks | Session mouse events suppressed | Detailed physical coverage pending |
| Mouse buttons, drag, and movement | Session pointer events suppressed | User confirmed local pointer actions blocked; external-device coverage pending |
| Mouse wheel and two-finger scroll | Deliberately passed through | Scroll-enabled build tested by the user; omission verified in the installed helper's active tap mask |
| Multi-finger trackpad gestures and media keys | Outside the intercepted event mask | Unsupported by this MVP |
| Power button, lid close, system-reserved controls | macOS retains control | No complete input-blocking claim |
| Visible content and brightness | No overlay, cursor hiding, or brightness changes | Short local session verified; 15-minute check pending |
| Idle sleep | Display and system idle sleep assertions held during lock | Assertion creation and teardown verified |
| Touch ID unlock | Triple Command tap opens Apple's biometric authentication policy | Previous hold gesture physically confirmed on 2026-09-28; new triple tap needs physical acceptance |
| Recovery gesture | Both Command keys held for 8 seconds | Timing self-check passed; physical recovery check pending |
| Duration selection | Six duration rows; Enter starts the selected session directly | Command check covers all six actions, invalid durations, and repeated launch prevention |
| Automatic duration release | Guardian deadline starts at monotonic activation | Actual supervisor checked with a shortened test-only duration and delayed startup |
| Frozen worker recovery | Independent guardian, 5-second heartbeat limit and 1-second termination grace | Signed installed build launched through Raycast; frozen worker terminated in 5.71 seconds, event tap and both sleep assertions disappeared |

The worker releases its event tap and wake assertions on normal unlock, SIGTERM/SIGINT, guardian exit, permission loss, a disabled event tap, display reconfiguration, sleep, or session resignation. Worker termination also removes its process-owned event tap and power assertions. Manual sleep and lid-close behavior are not overridden. If the guardian disappears, a responsive worker releases itself. Simultaneous guardian loss and a frozen worker is outside this guarantee.

As a last resort, force-quit the **input-lock** worker in Activity Monitor or terminate its exact PID with `kill -KILL <worker-pid>`. Ordinary termination depends on the worker's main loop. A reboot should not be necessary.

The bounded native harness covers duration validation, startup refusal, ordinary unlock, activation-based expiry, a frozen worker using production recovery timings, parent loss, guardian termination and loss, late output closure, closed or full output, and refusal of private workers launched by another executable. Its simulated workers compile only into the check binary and never create input taps. The release binary accepts only the six duration tokens.

On 2026-09-28, build, lint, TypeScript, Command timing, universal architecture and signature checks passed. An independent source review of the new process and pipe boundary found two issues that were fixed and checked before packaging. A final launch through Raycast with development stopped created an enabled tap with keyboard and pointer filtering and no scroll-wheel interception. The worker was then frozen deliberately; its guardian released it and macOS removed its tap and sleep assertions. The installed helper and `dist/input-lock.rayext` contain the same signed native asset. Test timers and helper processes were stopped after validation.

On 2026-09-29, a physical test showed that simultaneous taps of both Command keys were rejected. The detector now counts a tap when all pressed Command keys are released, supporting either key or both keys together. A regression check feeds the real modifier-event sequence through the chord and tap detectors. Physical acceptance of the correction remains pending.

On 2026-09-29, the form and confirmation were replaced with direct duration actions, and triple Command taps replaced the Touch ID hold trigger. The command harness, native gesture self-test, lint, TypeScript build, universal binary signature, and permission probe passed. The installed Raycast list was inspected; physical triple-tap and Touch ID acceptance remains pending.

On 2026-09-28, a first-use gesture gate that prevented locking was removed. The user then confirmed typing and pointer actions were blocked and restored after Touch ID. The command check covers all duration actions, invalid input, repeated launch prevention, helper lifetime, final status feedback, signal diagnostics, recovery feedback and trailing status records.

Device hot-plugging, permission revocation, screen lock, user switching, and external-display recovery still need physical acceptance checks. UI automation can bypass the event tap, so synthetic typing is not evidence of physical input blocking.

## Store status

This MVP is installed locally and has been verified with the development watcher stopped. Store installation, review, and updates have not been verified, so the complete Store requirement remains open. Raycast's [binary dependency rules](https://developers.raycast.com/basics/prepare-an-extension-for-store#binary-dependencies-and-additional-configuration) require traceable sources and builds; its documented binary packaging route involves the Raycast team. The Swift source and build script make this helper reviewable, but do not establish Store approval.

The architecture follows Raycast's [command lifecycle](https://developers.raycast.com/information/lifecycle) and [asset packaging](https://developers.raycast.com/information/file-structure). [CleanLock](https://github.com/fromtimo/CleanLock) was inspected as a reference. This implementation does not copy its source or use its device seizure approach.

The POC established permissions, event-tap creation, wake assertions, and physical Touch ID unlock. The MVP adds direct duration actions, permission checks, recovery, and a universal helper build. Store delivery and the remaining physical acceptance matrix are the next release gate.
