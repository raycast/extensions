# Release validation

## Live validation on 2026-11-05

Tested against the installed local Ghosthand daemon and one physical iPhone running iOS 27.2, with USB capture and Bluetooth control ready. The phone was reconnected and unlocked after the initial disconnected-device checks.

- [x] Compared the daemon's `GET /v1/openapi.yaml` contract with the published OpenAPI 1.0.0 snapshot. Every used endpoint matches. Differences concern explanatory text and unused update/setup fields; no type changes were needed.
- [x] Opened List iPhones in native Raycast and verified device, host, model, iOS, USB, Bluetooth, and unlocked metadata.
- [x] Verified empty device-list responses while the phone was disconnected.
- [x] Held a test lease, confirmed a second acquisition was rejected as busy, and confirmed a preview did not change the first lease's expiry. The test lease was released afterward.
- [x] Rendered the phone screenshot in native Raycast with its correct aspect ratio. The original data URI rendered blank; switching to a private temporary image file fixed it.
- [x] Ran Copy Screenshot and observed its success toast. Its temporary copy file was removed afterward. Pasting into another app remains unverified.
- [x] Saved a screenshot to Downloads from native Raycast and verified it was a 600 × 1304 JPEG. The test file was removed after validation.
- [x] Read local OCR through the daemon and native Raycast. Confirmed the lines appeared in reading order and that Run Task Using Screen Context opened an editable form without submitting it.
- [x] Completed a harmless hosted task through the client and native Run iPhone Task command. Observed progress, the final “Home Screen confirmed” response, and released control. Fixed a development-renderer lifecycle issue that stopped the task as soon as its result view opened.
- [x] Selected Ghosthand from the AI Extensions mention picker in Raycast AI Chat. The live `list-iphones` tool returned the connected ready phone.
- [x] Ran the Home quick action through Raycast AI Chat and received a successful tool result. The chat inherited Auto permissions, so Raycast approved this routine action without displaying the tool's confirmation. No permission settings were changed.
- [x] Recorded healthy-device latency: device list about 70 ms; initial preview about 1.71 s and warm preview about 24 ms; local OCR about 297 ms. These are individual observations on this machine, not a benchmark distribution.

## Automated validation

- All 43 tests passed. They exercise a real HTTP server on a temporary Unix socket, task streaming and JSON responses, cancellation/acquisition races, lease cleanup, input validation, AI result serialization, confirmation content, preview-file cleanup, and task-view lifecycle replay.
- All six mocked Raycast AI routing evaluations passed: discovery, hosted-task routing, OCR, typing without Enter, busy devices, and ambiguous device selection. Mocked evaluations do not perform physical phone actions.
- Extension build, TypeScript checks, and lint passed. Lint retains branding-only title-case warnings for “List iPhones”.

## Remaining physical-device checks

These cases are not established by the passing automated tests or the live checks above:

- [ ] Open all six commands across loading, empty, setup, and error states.
- [ ] Connect two phones, including identical names, and confirm exact device selection.
- [ ] Verify the native busy-state presentation with another client's lease.
- [ ] Stop during acquisition and a streamed task; navigate back and close Raycast; verify cleanup and distinguish closing from merely hiding a mounted view.
- [ ] Force-quit Raycast during an operation and confirm eventual idle expiry.
- [ ] Record a completed final-response JSON task and its cancellation behavior on hardware.
- [ ] Unplug the phone or stop the daemon during preview, OCR, and tasks; verify stale-content removal and no automatic mutation retry.
- [ ] Paste the copied screenshot into another app; open the saved JPEG in an image viewer.
- [ ] Exercise selected/all OCR text copy in native Raycast.
- [ ] Exercise both scroll directions, mute/unmute, lock, Type Text, Tap Text, and separate Enter on disposable UI targets. Only Home has a confirmed live quick-action result.
- [ ] Verify the tool confirmation and denial flows with Raycast configured to Ask, rather than Auto.
- [ ] Exercise signed-out, missing-permission, disconnected-Bluetooth, locked-phone, and plan-restriction setup states.

The extension is ready for further local use and testing. This record does not claim that every hardware acceptance scenario is complete.
