import Foundation
import RaycastSwiftMacros
import DesignRulerCore

/// Returns only if the overlay didn't open, with what to tell the user.
@raycast func inspect(showHintBar: Bool, corrections: String) -> String? {
    MeasureCoordinator.shared.run(hideHintBar: !showHintBar, corrections: corrections)
    return startupFailureMessage()
}
