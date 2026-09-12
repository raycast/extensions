import Foundation

/// Wraps the SidecarCore private framework to discover, connect, and disconnect Sidecar devices.
/// Uses dlopen + Objective-C runtime to avoid direct framework linking.
final class SidecarManager {
    static let shared = SidecarManager()
    private static let operationTimeoutNanoseconds: UInt64 = 15_000_000_000

    private var manager: NSObject?
    private var isLoaded = false
    private var loadError: String?

    private init() {
        loadFramework()
    }

    private func loadFramework() {
        guard dlopen("/System/Library/PrivateFrameworks/SidecarCore.framework/SidecarCore", RTLD_LAZY) != nil else {
            loadError = "Failed to load SidecarCore framework"
            return
        }

        guard let managerClass = NSClassFromString("SidecarDisplayManager") as? NSObject.Type else {
            loadError = "SidecarDisplayManager class not found"
            return
        }

        guard let mgr = managerClass.perform(Selector(("sharedManager")))?.takeUnretainedValue() as? NSObject else {
            loadError = "Failed to get SidecarDisplayManager shared instance"
            return
        }

        manager = mgr
        isLoaded = true
    }

    /// Safely get a string property from an NSObject via a selector, only if the object responds to it.
    private func stringProperty(_ selector: String, of object: NSObject) -> String? {
        let sel = Selector((selector))
        guard object.responds(to: sel) else { return nil }
        return object.perform(sel)?.takeUnretainedValue() as? String
    }

    private func queryRawDevices(using manager: NSObject) throws -> [NSObject] {
        guard let devices = manager.perform(Selector(("devices")))?.takeUnretainedValue() as? [NSObject] else {
            throw SidecarError.queryFailed("Failed to query Sidecar devices")
        }

        return devices
    }

    private func findDevice(named deviceName: String, using manager: NSObject) throws -> NSObject {
        let rawDevices = try queryRawDevices(using: manager)

        guard let targetDevice = rawDevices.first(where: {
            let name = stringProperty("name", of: $0)
            return name?.lowercased() == deviceName.lowercased()
        }) else {
            throw SidecarError.deviceNotFound(deviceName)
        }

        return targetDevice
    }

    private func performDeviceOperation(
        selectorName: String,
        device: NSObject,
        errorMapper: @escaping (String) -> SidecarError
    ) async throws {
        guard isLoaded, let manager = manager else {
            throw SidecarError.frameworkNotLoaded(loadError ?? "Unknown error")
        }

        let selector = Selector((selectorName))
        guard manager.responds(to: selector) else {
            throw SidecarError.operationUnavailable(selectorName)
        }

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let completion = OperationCompletion(continuation)
            var timeoutTask: Task<Void, Never>?

            let closure: @convention(block) (_ error: NSError?) -> Void = { error in
                timeoutTask?.cancel()

                if let error = error {
                    completion.resume(with: .failure(errorMapper(error.localizedDescription)))
                } else {
                    completion.resume(with: .success(()))
                }
            }

            timeoutTask = Task {
                try? await Task.sleep(nanoseconds: Self.operationTimeoutNanoseconds)
                completion.resume(with: .failure(SidecarError.operationTimedOut(selectorName)))
            }

            manager.perform(selector, with: device, with: closure)
        }
    }

    func getDevices() throws -> [SidecarDeviceInfo] {
        guard isLoaded, let manager = manager else {
            throw SidecarError.frameworkNotLoaded(loadError ?? "Unknown error")
        }

        let devices = try queryRawDevices(using: manager)

        let connectedNames = Set((try? getConnectedDeviceNames()) ?? [])

        return devices.compactMap { device in
            guard let name = stringProperty("name", of: device) else {
                return nil
            }

            // Use the device name as the ID — it's unique per Apple ID and is what
            // SidecarLauncher uses for identification.
            let deviceID = name
            let isConnected = connectedNames.contains(name)

            return SidecarDeviceInfo(id: deviceID, name: name, isConnected: isConnected)
        }
    }

    func getConnectedDeviceNames() throws -> [String] {
        guard isLoaded, let manager = manager else {
            throw SidecarError.frameworkNotLoaded(loadError ?? "Unknown error")
        }

        let sel = Selector(("connectedDevices"))
        guard manager.responds(to: sel) else { return [] }

        if let connectedDevices = manager.perform(sel)?.takeUnretainedValue() as? [NSObject] {
            return connectedDevices.compactMap { device in
                stringProperty("name", of: device)
            }
        }

        return []
    }

    func connect(deviceName: String) async throws {
        guard isLoaded, let manager = manager else {
            throw SidecarError.frameworkNotLoaded(loadError ?? "Unknown error")
        }

        let targetDevice = try findDevice(named: deviceName, using: manager)
        try await performDeviceOperation(
            selectorName: "connectToDevice:completion:",
            device: targetDevice,
            errorMapper: SidecarError.connectionFailed
        )
    }

    func disconnect(deviceName: String) async throws {
        guard isLoaded, let manager = manager else {
            throw SidecarError.frameworkNotLoaded(loadError ?? "Unknown error")
        }

        let targetDevice = try findDevice(named: deviceName, using: manager)
        try await performDeviceOperation(
            selectorName: "disconnectFromDevice:completion:",
            device: targetDevice,
            errorMapper: SidecarError.disconnectionFailed
        )
    }
}

private final class OperationCompletion: @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: CheckedContinuation<Void, Error>?

    init(_ continuation: CheckedContinuation<Void, Error>) {
        self.continuation = continuation
    }

    func resume(with result: Result<Void, Error>) {
        lock.lock()
        guard let continuation else {
            lock.unlock()
            return
        }
        self.continuation = nil
        lock.unlock()

        switch result {
        case .success:
            continuation.resume()
        case .failure(let error):
            continuation.resume(throwing: error)
        }
    }
}

enum SidecarError: Error, CustomStringConvertible {
    case frameworkNotLoaded(String)
    case queryFailed(String)
    case deviceNotFound(String)
    case operationUnavailable(String)
    case operationTimedOut(String)
    case connectionFailed(String)
    case disconnectionFailed(String)
    case disconnectAllFailed(disconnected: [String], errors: [String])

    var description: String {
        switch self {
        case .frameworkNotLoaded(let msg): return "SidecarCore not available: \(msg)"
        case .queryFailed(let msg): return msg
        case .deviceNotFound(let name): return "Device '\(name)' not found. Check the device name and ensure both devices share the same Apple ID."
        case .operationUnavailable(let selector): return "Sidecar operation '\(selector)' is not available on this macOS version."
        case .operationTimedOut(let selector): return "Sidecar operation '\(selector)' timed out. Check Display Settings and try again."
        case .connectionFailed(let msg): return "Connection failed: \(msg)"
        case .disconnectionFailed(let msg): return "Disconnection failed: \(msg)"
        case .disconnectAllFailed(let disconnected, let errors):
            let errorSummary = errors.joined(separator: "; ")
            if disconnected.isEmpty {
                return "Failed to disconnect active Sidecar sessions: \(errorSummary)"
            }
            return "Disconnected from \(disconnected.joined(separator: ", ")), but some sessions failed to disconnect: \(errorSummary)"
        }
    }
}
