import Foundation

@main struct SnapshotTests {
    static func rejects(_ label: String, _ operation: () throws -> Void) {
        do {
            try operation()
            preconditionFailure("Expected rejection: \(label)")
        } catch is NativeFailure {
            // The policy must report its explicit safety failure.
        } catch {
            preconditionFailure("Unexpected error for \(label): \(error)")
        }
    }

    static func window(id: Int = 1, layer: Int = 0, x: Double = 0, y: Double = 0, width: Double = 100, height: Double = 100) -> WindowMetadataRecord {
        WindowMetadataRecord(id: id, layer: layer, x: x, y: y, width: width, height: height)
    }

    static func main() throws {
        let knownDiagnostic = nativeDiagnostic(phase: "baseline-first", api: "AXUIElementCopyAttributeValue", attribute: "AXWindows")
        precondition(knownDiagnostic == "[phase=baseline-first; api=AXUIElementCopyAttributeValue; attribute=AXWindows]")
        precondition(nativeDiagnostic(phase: "focus-restoration", api: "restoration") == "[phase=focus-restoration; api=restoration]")
        precondition(nativeDiagnostic(phase: "completion-action", api: "AXUIElementPerformAction", attribute: "AXPress") == "[phase=completion-action; api=AXUIElementPerformAction; attribute=AXPress]")
        precondition(nativeDiagnostic(phase: "baseline-first", api: "AXUIElementCopyAttributeValue", attribute: "AXWindows") == knownDiagnostic, "Diagnostics must be deterministic")
        let untrustedLabels = [
            "not-an-approved-label", "secret-fixture-token-123",
            "/private/fixture/user-document.txt", "pid=12345",
            "Personal fixture window title", "NSError private fixture description",
            "baseline-first\nsecret-fixture-token-123", "AXWindows\r\nsecret-fixture-token-123",
            "AXValue; value=secret-fixture-token-123"
        ]
        for label in untrustedLabels {
            let phaseDiagnostic = nativeDiagnostic(phase: label, api: "operation")
            let apiDiagnostic = nativeDiagnostic(phase: "preflight", api: label)
            let attributeDiagnostic = nativeDiagnostic(phase: "completion-read", api: "AXUIElementCopyAttributeValue", attribute: label)
            precondition(phaseDiagnostic == "[phase=unknown-phase; api=operation]")
            precondition(apiDiagnostic == "[phase=preflight; api=unknown-api]")
            precondition(attributeDiagnostic == "[phase=completion-read; api=AXUIElementCopyAttributeValue; attribute=unknown-attribute]")
            precondition(!phaseDiagnostic.contains(label) && !apiDiagnostic.contains(label) && !attributeDiagnostic.contains(label), "Untrusted labels must never be echoed")
        }
        precondition(nativeDiagnostic(phase: "", api: "", attribute: "") == "[phase=unknown-phase; api=unknown-api; attribute=unknown-attribute]")

        let value = try optionalAXDisposition(errorCode: 0)
        let missingValue = try optionalAXDisposition(errorCode: -25212)
        let unsupported = try optionalAXDisposition(errorCode: -25205)
        let requiredValue = try optionalAXDisposition(errorCode: 0, required: true)
        precondition(value == .value)
        precondition(requiredValue == .value)
        precondition(missingValue == .absent, "A supported optional leaf can lack a value")
        precondition(unsupported == .absent, "An unsupported optional attribute can be absent")
        for errorCode: Int32 in [-25212, -25205] {
            rejects("missing required window modality must not become nonmodal") {
                _ = try optionalAXDisposition(errorCode: errorCode, required: true)
            }
        }
        for errorCode: Int32 in [-25204, -25202, -25201, -25211, -25214, -25200, 1] {
            rejects("AX error \(errorCode) must not become absence") {
                _ = try optionalAXDisposition(errorCode: errorCode)
            }
        }

        let disabled = try nativeBoolean(0)
        let enabled = try nativeBoolean(1)
        precondition(!disabled)
        precondition(enabled)
        for malformedBoolean: Double in [0.5, 1.5, -1, 2, .nan, .infinity, -.infinity] {
            rejects("numeric boolean must be finite and exactly zero or one") {
                _ = try nativeBoolean(malformedBoolean)
            }
        }

        try validateSnapshotNode(ownerPID: 123, expectedPID: 123, depth: 0, count: 1)
        try validateSnapshotNode(ownerPID: 123, expectedPID: 123, depth: 20, count: 1600)
        rejects("foreign AX owner") {
            try validateSnapshotNode(ownerPID: 124, expectedPID: 123, depth: 0, count: 1)
        }
        for invalidPID: Int32 in [0, -1] {
            rejects("nonpositive AX PID \(invalidPID)") {
                try validateSnapshotNode(ownerPID: invalidPID, expectedPID: invalidPID, depth: 0, count: 1)
            }
        }
        rejects("negative traversal depth") {
            try validateSnapshotNode(ownerPID: 123, expectedPID: 123, depth: -1, count: 1)
        }
        for invalidCount in [0, -1] {
            rejects("nonpositive traversal count \(invalidCount)") {
                try validateSnapshotNode(ownerPID: 123, expectedPID: 123, depth: 0, count: invalidCount)
            }
        }
        rejects("incomplete traversal at depth boundary") {
            try validateSnapshotNode(ownerPID: 123, expectedPID: 123, depth: 21, count: 1)
        }
        rejects("incomplete traversal at node boundary") {
            try validateSnapshotNode(ownerPID: 123, expectedPID: 123, depth: 0, count: 1601)
        }

        try validateWindowMetadata(window())
        try validateWindowMetadata(window(layer: -1, x: -100, y: -200, width: 0, height: 0))
        let malformed = [
            window(id: 0), window(id: -1),
            window(x: .nan), window(y: .infinity),
            window(width: -.infinity), window(height: .nan),
            window(width: -1), window(height: -1)
        ]
        for (index, record) in malformed.enumerated() {
            rejects("malformed bounds or ID \(index)") { try validateWindowMetadata(record) }
        }
        precondition(window() == window(), "Window metadata equality supports snapshot comparisons")
        precondition(window() != window(width: 101), "A changed window bound must differ")

        try confirmClosedBaseline(axWindowCount: 0, ownedWindows: [])
        try confirmClosedBaseline(axWindowCount: 0, ownedWindows: [window(layer: 25), window(id: 2, layer: -1)])
        rejects("empty AX disagrees with owned normal CG window") {
            try confirmClosedBaseline(axWindowCount: 0, ownedWindows: [window()])
        }
        rejects("AX reports an existing window") {
            try confirmClosedBaseline(axWindowCount: 1, ownedWindows: [])
        }
        rejects("invalid AX count cannot establish absence") {
            try confirmClosedBaseline(axWindowCount: -1, ownedWindows: [])
        }
        rejects("mixed CG layers retain the existing normal window") {
            try confirmClosedBaseline(axWindowCount: 0, ownedWindows: [window(layer: 25), window(id: 2)])
        }
        rejects("malformed overlay cannot establish a trustworthy baseline") {
            try confirmClosedBaseline(axWindowCount: 0, ownedWindows: [window(layer: 25, width: .nan)])
        }

        try confirmSettingsIdentity(firstHasSettings: false, secondHasSettings: false, sameWindow: false)
        try confirmSettingsIdentity(firstHasSettings: false, secondHasSettings: false, sameWindow: true)
        try confirmSettingsIdentity(firstHasSettings: true, secondHasSettings: true, sameWindow: true)
        rejects("an open settings window lost its classification") {
            try confirmSettingsIdentity(firstHasSettings: true, secondHasSettings: false, sameWindow: true)
        }
        rejects("settings appeared during baseline inspection") {
            try confirmSettingsIdentity(firstHasSettings: false, secondHasSettings: true, sameWindow: true)
        }
        rejects("settings presence is stable but the window identity changed") {
            try confirmSettingsIdentity(firstHasSettings: true, secondHasSettings: true, sameWindow: false)
        }

        precondition(shouldRestoreFocus(previousPID: 100, currentPID: 123, controlledPID: 123, windowTouched: true))
        precondition(!shouldRestoreFocus(previousPID: 100, currentPID: 124, controlledPID: 123, windowTouched: true), "Respect user focus takeover")
        precondition(!shouldRestoreFocus(previousPID: 100, currentPID: 123, controlledPID: 123, windowTouched: false), "A preflight failure must not restore untouched focus")
        precondition(!shouldRestoreFocus(previousPID: 123, currentPID: 123, controlledPID: 123, windowTouched: true), "No restoration is needed when the controlled app was already focused")
        precondition(!shouldRestoreFocus(previousPID: nil, currentPID: 123, controlledPID: 123, windowTouched: true), "An unknown previous app cannot be restored")
        precondition(!shouldRestoreFocus(previousPID: 100, currentPID: nil, controlledPID: 123, windowTouched: true), "Unknown current focus must not be overridden")
        print("Native snapshot regressions passed: optional AX absence versus transport failure, owner and traversal boundaries, finite window metadata, AX/CG baseline disagreement, and conditional focus restoration.")
    }
}
