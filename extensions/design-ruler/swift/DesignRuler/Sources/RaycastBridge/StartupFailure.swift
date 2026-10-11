import DesignRulerCore

/// What the command's HUD says when the overlay didn't open. The bridges only get here then:
/// an overlay that opens ends the process when it closes, so `run()` never returns.
func startupFailureMessage() -> String {
    PermissionChecker.hasScreenRecordingPermission()
        ? "Couldn't capture the screen"
        : "Allow Raycast in Privacy & Security → Screen Recording"
}
