import Foundation
import MotionMountKit
import RaycastSwiftMacros

struct Status: Encodable {
    let deviceID: String?
    let position: Position
    let presets: [Preset]
}

struct Diagnostics: Encodable {
    let status: String
    let step: Int?
    let totalSteps: Int
    let code: Int?
}

@raycast func getStatus(deviceID: String) async throws -> Status {
    try await Mount.session(deviceID: deviceID) { mount in
        guard let position = Position(
            distance: try await mount.read(Characteristic.distance),
            rotation: try await mount.read(Characteristic.rotation)
        ) else { throw MountError.invalidResponse }
        return Status(deviceID: mount.deviceID, position: position, presets: try await mount.readPresets())
    }
}

@raycast func goTo(deviceID: String, distance: Int, rotation: Int) async throws -> Position {
    let target = Position(distance: distance, rotation: rotation).clamped
    try await Mount.session(deviceID: deviceID) { mount in
        try await mount.write(target.encoded, to: Characteristic.target)
    }
    return target
}

@raycast func addPreset(deviceID: String, name: String, distance: Int, rotation: Int) async throws -> Preset {
    try await Mount.session(deviceID: deviceID) { mount in
        guard let slot = Preset.firstFreeSlot(among: try await mount.readPresets()) else { throw MountError.noFreeSlot }
        return try await mount.store(Preset(index: slot, name: name, position: Position(distance: distance, rotation: rotation).clamped))
    }
}

@raycast func updatePreset(deviceID: String, index: Int, name: String, distance: Int, rotation: Int) async throws -> Preset {
    try await Mount.session(deviceID: deviceID) { mount in
        try await mount.store(Preset(index: index, name: name, position: Position(distance: distance, rotation: rotation).clamped))
    }
}

@raycast func deletePreset(deviceID: String, index: Int) async throws {
    let (part1, part2) = Preset.cleared
    try await Mount.session(deviceID: deviceID) { mount in
        try await mount.write(part1, to: Characteristic.presetPart1[index])
        try await mount.write(part2, to: Characteristic.presetPart2[index])
    }
}

@raycast func startDiagnostics(deviceID: String) async throws {
    try await Mount.session(deviceID: deviceID) { mount in
        try await mount.write(Data([0x01]), to: Characteristic.calibration)
    }
}

@raycast func getDiagnostics(deviceID: String) async throws -> Diagnostics {
    let byte = try await Mount.session(deviceID: deviceID) { mount in
        try await mount.read(Characteristic.calibration).first ?? 0
    }
    switch DiagnosticsState(byte: byte) {
    case .running(let step): return Diagnostics(status: "running", step: step, totalSteps: DiagnosticsState.totalSteps, code: nil)
    case .passed: return Diagnostics(status: "passed", step: nil, totalSteps: DiagnosticsState.totalSteps, code: nil)
    case .failed(let code): return Diagnostics(status: "failed", step: nil, totalSteps: DiagnosticsState.totalSteps, code: code)
    }
}
