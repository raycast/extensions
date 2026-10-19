# Input lock acceptance

These checks use the compiled production helper and real macOS event taps. They do not substitute mocked Raycast APIs, authentication, or worker processes.

From this extension folder:

```sh
npm run build -- -e dev -o /tmp/clean-keyboard-build
python3 scripts/e2e-input-lock.py
python3 scripts/e2e-input-lock.py --live
python3 -m http.server 8765 --bind 127.0.0.1 --directory e2e
```

`--live` blocks typing and clicks on the current Mac for up to 30 seconds. It requires enrolled Touch ID plus the helper's existing Accessibility and Input Monitoring grants. It exercises timed release, duplicate-instance refusal, an actual frozen worker, and supervisor termination. Any missing prerequisite fails the live run. Every started supervisor is cleaned up even when an assertion fails.

Open `http://127.0.0.1:8765/browser-witness.html` in the existing browser. Use real keyboard/pointer input. DOM-driven filling, clicking, and synthetic JavaScript events bypass the operating system tap and cannot verify input blocking.

1. Establish a baseline by typing in the input, clicking the counter, and scrolling. Confirm the displayed counts change.
2. Keep the input focused, start a 30-second lock from Raycast, and attempt typing/clicking. Confirm text, key count, and click count do not change. Scroll and confirm the scroll count does change. After expiry, confirm typing/clicking work again.
3. Start a new timed lock. Triple-tap either Command key, cancel Touch ID, and confirm input stays blocked. Triple-tap again and authenticate physically. Confirm input returns and Raycast reports Touch ID release.
4. Start another timed lock and hold both Command keys for eight seconds. Confirm release without authentication. Repeat the triple-tap gesture with both Command keys together and confirm it opens Touch ID.
5. Run the original **Lock Keyboard** command for 15 seconds. Confirm its keyboard-only behavior and Ctrl+U release still work. Its default-duration preference, Ask AI entry point, Windows implementation, and Fn-key preference are unchanged by this contribution.
6. With permissions unavailable, confirm the new command reports the missing permission and leaves input usable. Only the user should change privacy grants; do not automate permission toggles.

A passing process suite does not establish the browser checks or biometric success. Record each result separately in the PR.
