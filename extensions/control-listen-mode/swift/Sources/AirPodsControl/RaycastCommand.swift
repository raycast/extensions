import Foundation
import RaycastSwiftMacros

@raycast func toggleListeningMode(lockPath: String) -> ToggleResult {
    runToggle(lockPath: lockPath)
}
