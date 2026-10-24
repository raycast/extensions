Simulator Control manual verification
Date: 2026-10-24

Environment
  macOS 27.0.1, Xcode 27.1 (27A9275).
  Test device: iPhone 18 Pro Max, iOS 27.0.
  Initial and restored device state: Shutdown.

Raycast 1.104.32
  - The available simulator list loaded successfully (56 devices).
  - Booting a shutdown device opened its Device Hub window.
  - Opening an already booted device selected the correct window.
  - Shutdown refreshed the device list.
  - After a real boot succeeded, a controlled window-launch failure refreshed
    the row to Booted and left both Open and Shutdown available.
  - Removing the launch fault allowed Open to succeed without another boot.

Raycast 2.9.0.0
  - Rechecked loading, Open, Shutdown, and Boot through Raycast's UI.
  - Confirmed the new boot completed with Apple's simctl bootstatus command.
  - Used the official @raycast/api@2.9.0 development CLI via npm exec. The old
    development CLI produced a Missing executable error in Raycast 2.9; using
    the current CLI loaded the same source without changing package files.

Recording: open-failure-retry.mp4
  Recorded during the Raycast 1.104.32 verification. The clip shows a shutdown
  device being booted, the launch error with a refreshed Booted state, the
  available Open/Shutdown actions, and the successful retry in Device Hub.
  Waiting and setup footage were cut. Only the relevant application windows
  were cropped into the video; audio was omitted. Screen-selection handles
  from the macOS recording tool remain visible in the final device shot.

Fault injection
  For this manual test only, the application argument passed to macOS open
  was temporarily replaced with a nonexistent app path after the real simctl
  boot completed. CoreSimulator operations and the successful retry were real.
  The temporary source change and its marker were removed before validation
  and commit; no fault-injection logic is present in the extension.

Final checks
  npm test: 16 passed. npm run lint: passed. npm run build: passed.
  Older Xcode versions were not available for another interactive test.
  The original report identifies Raycast 2.9.0.0 with Xcode 27; it does not
  establish the first affected Raycast version:
  https://github.com/raycast/extensions/issues/32649
