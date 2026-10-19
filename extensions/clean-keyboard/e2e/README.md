# Clean Keyboard acceptance

The checks exercise the existing Swift `handler` export and actual macOS event taps. There are no mocked Raycast APIs, authentication replacements, or separate test helpers.

```sh
npm run build -- -e dev -o /tmp/clean-keyboard-build
python3 scripts/e2e-input-lock.py
```

The default suite refuses invalid duration and argument values before any input tap is acquired. `--live` additionally runs a one-second keyboard-only lock, a one-second mouse-click lock, and actual parent-exit recovery. It requires enrolled Touch ID and existing Accessibility/Input Monitoring grants. Run live checks only during an agreed test window; do not run them unattended while someone is using the Mac.

## Browser and Raycast flow

Serve the witness with `python3 -m http.server 8765 --bind 127.0.0.1 --directory e2e`, and open `http://127.0.0.1:8765/browser-witness.html` in the existing browser. Use physical keyboard/pointer input. DOM filling, accessibility actions, and CDP-generated events can bypass macOS event taps and do not prove physical input blocking.

1. With **Lock Mouse Clicks** off, run the existing **Lock Keyboard** command for 15 seconds. Verify typing is blocked, clicking and scrolling work, and Ctrl+U releases it. Confirm the unchanged duration list and default-duration preference still work.
2. Enable **Lock Mouse Clicks** in existing Clean Keyboard preferences. Run the same command. Verify typing, clicks and dragging are blocked; pointer movement and scrolling remain available. After expiry, verify typing and clicks return.
3. Start a timed mouse-click lock. Press Ctrl+U, cancel Touch ID with Escape, and verify input stays locked. Triple-tap Command and authenticate physically. Verify input returns and the existing Raycast view returns to its duration list.
4. Start another timed lock and hold both Command keys for eight seconds. Verify release without authentication. Repeat with both keys held before the native lock starts, and verify continued holding releases it after eight seconds. Also verify triple-tapping both Command keys together opens Touch ID.
5. With **Lock Mouse Clicks** off, ask Ask AI to lock for 15 seconds. Check that its confirmation describes keyboard-only locking and Ctrl+U release. Cancel once and confirm no lock starts; repeat, approve, and verify the existing command starts for 15 seconds and Ctrl+U releases it. Repeat with **Lock Mouse Clicks** on: the confirmation must describe clicks plus Touch ID/recovery, and approval must start the same command with that mode. Verify its timer releases input. Ask how to unlock and confirm Ask AI answers without starting a lock. Keep all accepted durations bounded during this test.
6. On a Mac missing the required grants or Touch ID enrollment, verify the optional mouse-click mode fails without locking or repeatedly opening permission dialogs. Only the user may change privacy grants.
7. Close the agreed test window: stop any development watcher started for it, confirm no native helper remains alive, and verify normal browser typing and clicking. Do not keep launching Raycast or input locks afterward.

Windows keyboard locking, Fn-key preference behavior, and all existing icons/branding are preserved. Record actual behavior separately from build and process-suite results. A passing process suite does not establish biometric or physical browser acceptance.
