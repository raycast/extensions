import Foundation
import IOKit
import IOKit.hid

let helperProtocolVersion = 1

enum DeviceIdentityState: String, Codable, Sendable {
    case stable
    case ambiguous
}

struct DeviceIdentity: Codable, Hashable, Sendable {
    let key: String
    let profileKey: String?
    let identityState: DeviceIdentityState
    let name: String
    let vendorID: Int
    let productID: Int
    let serialNumber: String?
    let locationID: Int?
    let registryEntryID: UInt64

    init(name: String, vendorID: Int, productID: Int, serialNumber: String?, locationID: Int?, registryEntryID: UInt64 = 0) {
        self.name = name
        self.vendorID = vendorID
        self.productID = productID
        self.serialNumber = serialNumber?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        self.locationID = locationID
        self.registryEntryID = registryEntryID
        if let serial = self.serialNumber {
            key = String(format: "%04x:%04x:serial:%@", vendorID, productID, serial)
            profileKey = key
            identityState = .stable
        } else if let locationID {
            key = String(format: "%04x:%04x:location:%08x", vendorID, productID, locationID)
            profileKey = key
            identityState = .stable
        } else {
            // An IORegistry entry is useful to distinguish this session, but is not a durable physical identity.
            key = String(format: "ambiguous:%04x:%04x:registry:%016llx", vendorID, productID, registryEntryID)
            profileKey = nil
            identityState = .ambiguous
        }
    }

    init(device: IOHIDDevice) {
        func integer(_ key: CFString) -> Int { (IOHIDDeviceGetProperty(device, key) as? NSNumber)?.intValue ?? 0 }
        func string(_ key: CFString) -> String? { IOHIDDeviceGetProperty(device, key) as? String }
        var entryID: UInt64 = 0
        IORegistryEntryGetRegistryEntryID(IOHIDDeviceGetService(device), &entryID)
        self.init(
            name: string(kIOHIDProductKey as CFString) ?? "Unknown Mouse",
            vendorID: integer(kIOHIDVendorIDKey as CFString),
            productID: integer(kIOHIDProductIDKey as CFString),
            serialNumber: string(kIOHIDSerialNumberKey as CFString),
            locationID: (IOHIDDeviceGetProperty(device, kIOHIDLocationIDKey as CFString) as? NSNumber)?.intValue,
            registryEntryID: entryID
        )
    }
}

struct DeviceProfile: Codable, Equatable, Sendable {
    var name: String
    var reverseVertical: Bool
    var reverseHorizontal: Bool
    var verticalMultiplier: Double
    var horizontalMultiplier: Double

    static func defaults(name: String) -> DeviceProfile {
        DeviceProfile(name: name, reverseVertical: false, reverseHorizontal: false, verticalMultiplier: 1, horizontalMultiplier: 1)
    }

    func validationError() -> String? {
        guard name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false else { return "Profile name is required." }
        for value in [verticalMultiplier, horizontalMultiplier] {
            guard value.isFinite, (0.1 ... 10).contains(value) else { return "Multipliers must be finite and between 0.1 and 10." }
        }
        return nil
    }
}

struct HelperConfiguration: Codable, Equatable, Sendable {
    var version = helperProtocolVersion
    var profiles: [String: DeviceProfile] = [:]

    func validationError() -> String? {
        guard version == helperProtocolVersion else { return "Unsupported profile protocol version." }
        return profiles.values.compactMap { $0.validationError() }.first
    }
}

struct AccessStatus: Encodable, Sendable {
    let protocolVersion: Int = helperProtocolVersion
    let inputMonitoring: Bool
    let accessibility: Bool
}

struct DeviceListResponse: Encodable, Sendable {
    let protocolVersion: Int = helperProtocolVersion
    let devices: [DeviceIdentity]
}

struct VersionResponse: Encodable, Sendable {
    let protocolVersion: Int = helperProtocolVersion
    let version: String = "1.0.0"
}

struct RuntimeCounters: Codable, Equatable, Sendable {
    var observedHID = 0
    var matchedQuartz = 0
    var transformedEvents = 0
    var unmatchedQuartz = 0
    var ambiguousDevices = 0
}

struct RuntimeRecord: Codable, Sendable {
    let protocolVersion: Int
    let pid: Int32
    let executablePath: String
    let configPath: String
    let startedAt: Date
    let updatedAt: Date
    let counters: RuntimeCounters
}

enum RuntimeState: String, Codable, Sendable {
    case stopped, running, stale, identityMismatch
}

struct RuntimeStatus: Encodable, Sendable {
    let protocolVersion: Int = helperProtocolVersion
    let state: RuntimeState
    let pid: Int32?
    let executablePath: String?
    let detail: String?
    let counters: RuntimeCounters?
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
