import Foundation
import RaycastSwiftMacros

/// Entry point exposed to TypeScript via `import { startCleaningMode } from "swift:../swift"`.
///
/// Enters "cleaning mode": draws a black overlay window on every screen and
/// suppresses keyboard input, then blocks until the user clicks the centered
/// "Done" button. The Promise resolving back to TypeScript is what lets the
/// no-view command in `src/clean-keyboard-and-screen.ts` finish (dev-docs.md §13.3).
///
/// `CleaningModeController.run()` owns the overlay windows and the AppKit run
/// loop, so the overlay survives the short-lived JS call that started it.
@raycast func startCleaningMode() async {
  await CleaningModeController.run()
}
