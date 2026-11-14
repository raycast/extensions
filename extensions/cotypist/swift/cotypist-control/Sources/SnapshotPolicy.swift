enum OptionalAXDisposition: Equatable {
    case value
    case absent
}

func nativeDiagnostic(phase: String, api: String, attribute: String? = nil) -> String {
    let phases: Set<String> = [
        "preflight", "baseline-first", "baseline-second", "settings-route",
        "settings-acknowledgement", "general-pane-action", "general-pane-read",
        "completion-read", "completion-action", "disable-confirmation",
        "completion-readback", "status-metadata-read", "window-restoration", "focus-restoration"
    ]
    let apis: Set<String> = [
        "AXUIElementGetPid", "AXUIElementCopyAttributeValue", "AXUIElementCopyActionNames",
        "AXUIElementIsAttributeSettable", "AXUIElementSetAttributeValue",
        "AXUIElementPerformAction", "operation", "restoration"
    ]
    let attributes: Set<String> = [
        "AXRole", "AXSubrole", "AXModal", "AXSelected", "AXTitle", "AXDescription",
        "AXValue", "AXChildren", "AXWindows", "AXMainWindow", "AXFocusedWindow",
        "AXCloseButton", "AXEnabled", "AXPress"
    ]
    let safePhase = phases.contains(phase) ? phase : "unknown-phase"
    let safeAPI = apis.contains(api) ? api : "unknown-api"
    var result = "[phase=\(safePhase); api=\(safeAPI)"
    if let attribute {
        let safeAttribute = attributes.contains(attribute) ? attribute : "unknown-attribute"
        result += "; attribute=\(safeAttribute)"
    }
    return result + "]"
}

func optionalAXDisposition(errorCode: Int32, required: Bool = false) throws -> OptionalAXDisposition {
    switch errorCode {
    case 0:
        return .value
    case -25212, -25205:
        // Missing optional attributes are distinct from failed AX messaging.
        if required {
            throw NativeFailure(message: "A required Cotypist Accessibility snapshot attribute is unavailable. No missing state was assumed.")
        }
        return .absent
    default:
        throw NativeFailure(message: "Cotypist's Accessibility snapshot could not be read safely (error \(errorCode)). No missing state was assumed.")
    }
}

func nativeBoolean(_ number: Double) throws -> Bool {
    guard number.isFinite, number == 0 || number == 1 else {
        throw NativeFailure(message: "Cotypist returned an unexpected boolean state. No truncated numeric value was accepted.")
    }
    return number == 1
}

func validateSnapshotNode(ownerPID: Int32, expectedPID: Int32, depth: Int, count: Int) throws {
    guard ownerPID > 0, expectedPID > 0, ownerPID == expectedPID else {
        throw NativeFailure(message: "Cotypist's Accessibility snapshot included an element owned by another process. No setting was changed.")
    }
    guard depth >= 0, depth <= 20, count >= 1, count <= 1600 else {
        throw NativeFailure(message: "Cotypist's Accessibility snapshot exceeded its safe traversal limit. No missing state was assumed.")
    }
}

struct WindowMetadataRecord: Equatable {
    let id: Int
    let layer: Int
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

func validateWindowMetadata(_ record: WindowMetadataRecord) throws {
    guard record.id > 0,
          record.x.isFinite, record.y.isFinite,
          record.width.isFinite, record.height.isFinite,
          record.width >= 0, record.height >= 0 else {
        throw NativeFailure(message: "Cotypist's window metadata was invalid. No window was assumed closed.")
    }
}

func confirmClosedBaseline(axWindowCount: Int, ownedWindows: [WindowMetadataRecord]) throws {
    for window in ownedWindows { try validateWindowMetadata(window) }
    guard axWindowCount == 0, !ownedWindows.contains(where: { $0.layer == 0 }) else {
        throw NativeFailure(message: "Cotypist's window metadata does not establish a closed settings baseline. No existing window was treated as disposable.")
    }
}

func confirmSettingsIdentity(firstHasSettings: Bool, secondHasSettings: Bool, sameWindow: Bool) throws {
    guard firstHasSettings == secondHasSettings,
          !firstHasSettings || sameWindow else {
        throw NativeFailure(message: "Cotypist's settings classification or window identity changed during baseline inspection. No window was assumed closed.")
    }
}

func shouldRestoreFocus(previousPID: Int32?, currentPID: Int32?, controlledPID: Int32, windowTouched: Bool) -> Bool {
    guard windowTouched, let previousPID, let currentPID else { return false }
    return currentPID == controlledPID && previousPID != controlledPID
}
