import Foundation
import RaycastSwiftMacros

@raycast func discoverDevices() async throws -> [SidecarDeviceInfo] {
    return try SidecarManager.shared.getDevices()
}

@raycast func connectDevice(name: String) async throws -> String {
    try await SidecarManager.shared.connect(deviceName: name)
    return "Connected to \(name)"
}

@raycast func disconnectDevice(name: String) async throws -> String {
    try await SidecarManager.shared.disconnect(deviceName: name)
    return "Disconnected from \(name)"
}

@raycast func disconnectAll() async throws -> String {
    let manager = SidecarManager.shared
    let connectedNames = try manager.getConnectedDeviceNames()

    if connectedNames.isEmpty {
        return "No active Sidecar connections"
    }

    var disconnected: [String] = []
    var errors: [String] = []

    for name in connectedNames {
        do {
            try await manager.disconnect(deviceName: name)
            disconnected.append(name)
        } catch {
            errors.append("\(name): \(error)")
        }
    }

    if errors.isEmpty {
        return "Disconnected from \(disconnected.joined(separator: ", "))"
    }

    throw SidecarError.disconnectAllFailed(disconnected: disconnected, errors: errors)
}
