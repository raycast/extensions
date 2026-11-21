import CoreAudio
import Foundation

struct CoreAudioBackend: AudioBackend {
    // These BTAudioHAL properties are discovered at runtime and are outside the public SDK.
    private enum Property {
        static let appleAudio: UInt32 = 0x6961_6170 // iaap
        static let listeningMode: UInt32 = 0x6C73_746D // lstm
        static let supportedModes: UInt32 = 0x6C73_6D73 // lsms
        static let earDetectionEnabled: UInt32 = 0x6965_6465 // iede
        static let primaryEar: UInt32 = 0x7072_6973 // pris
        static let earPlacement: UInt32 = 0x6965_7362 // iesb
    }

    private static let airPodsProducts: Set<UInt16> = [
        0x200E, 0x2014, 0x2024, 0x2027, // AirPods Pro
        0x201B, 0x2030, 0x2036,         // AirPods 4 (ANC) and AirPods 5
        0x200A, 0x201F, 0x202D,         // AirPods Max
    ]

    func defaultAirPodsOutput() -> Output? {
        guard let id = read(kAudioHardwarePropertyDefaultOutputDevice, on: AudioObjectID(kAudioObjectSystemObject), as: UInt32.self),
              id != kAudioObjectUnknown,
              read(kAudioDevicePropertyDeviceIsAlive, on: id, as: UInt32.self) == 1,
              let transport = read(kAudioDevicePropertyTransportType, on: id, as: UInt32.self),
              let appleAudio = read(Property.appleAudio, on: id, as: UInt32.self), appleAudio != 0,
              let model = readString(kAudioDevicePropertyModelUID, on: id),
              Self.isSupportedAirPods(transport: transport, model: model),
              let uid = readString(kAudioDevicePropertyDeviceUID, on: id), !uid.isEmpty
        else { return nil }
        return Output(id: id, uid: uid)
    }

    static func isSupportedAirPods(transport: UInt32, model: String) -> Bool {
        guard transport == kAudioDeviceTransportTypeBluetooth || transport == kAudioDeviceTransportTypeBluetoothLE
        else { return false }

        let decimalPrefix = "BTHeadphones76,"
        if model.hasPrefix(decimalPrefix) {
            guard let product = UInt16(model.dropFirst(decimalPrefix.count)) else { return false }
            return airPodsProducts.contains(product)
        }

        // Core Audio can report the product and vendor IDs as hexadecimal fields.
        let fields = model.split(separator: " ")
        guard fields.count == 2, UInt16(fields[1], radix: 16) == 0x004C,
              let product = UInt16(fields[0], radix: 16)
        else { return false }
        return airPodsProducts.contains(product)
    }

    func placement(on output: Output) -> Placement? {
        guard read(Property.earDetectionEnabled, on: output.id, as: UInt32.self) == 1,
              let primary = read(Property.primaryEar, on: output.id, as: UInt32.self),
              primary == 1 || primary == 2,
              let pair = read(Property.earPlacement, on: output.id, as: (UInt32, UInt32).self),
              read(Property.primaryEar, on: output.id, as: UInt32.self) == primary,
              let primaryPlacement = EarPlacement(rawValue: pair.0),
              let secondaryPlacement = EarPlacement(rawValue: pair.1)
        else { return nil }
        return primary == 1
            ? Placement(left: primaryPlacement, right: secondaryPlacement)
            : Placement(left: secondaryPlacement, right: primaryPlacement)
    }

    func mode(on output: Output) -> ListeningMode? {
        read(Property.listeningMode, on: output.id, as: UInt32.self).flatMap(ListeningMode.init(rawValue:))
    }

    func supportsToggle(on output: Output) -> Bool {
        guard let modes = read(Property.supportedModes, on: output.id, as: UInt32.self) else { return false }
        return modes & 0b011 == 0b011
    }

    func canWriteMode(on output: Output) -> Bool {
        var address = address(for: Property.listeningMode)
        var settable = DarwinBoolean(false)
        return AudioObjectHasProperty(output.id, &address)
            && AudioObjectIsPropertySettable(output.id, &address, &settable) == noErr
            && settable.boolValue
    }

    func write(_ mode: ListeningMode, on output: Output) -> Bool {
        var address = address(for: Property.listeningMode)
        var rawMode = mode.rawValue
        let size = UInt32(MemoryLayout.size(ofValue: rawMode))
        return AudioObjectSetPropertyData(output.id, &address, 0, nil, size, &rawMode) == noErr
    }

    private func address(for selector: UInt32) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal,
                                   mElement: kAudioObjectPropertyElementMain)
    }

    private func read<T: BitwiseCopyable>(_ selector: UInt32, on object: AudioObjectID, as type: T.Type) -> T? {
        var address = address(for: selector)
        let expected = UInt32(MemoryLayout<T>.size)
        var size: UInt32 = 0
        guard AudioObjectHasProperty(object, &address),
              AudioObjectGetPropertyDataSize(object, &address, 0, nil, &size) == noErr,
              size == expected
        else { return nil }

        return withUnsafeTemporaryAllocation(of: T.self, capacity: 1) { buffer in
            guard let data = buffer.baseAddress,
                  AudioObjectGetPropertyData(object, &address, 0, nil, &size, data) == noErr,
                  size == expected
            else { return nil }
            return data.pointee
        }
    }

    private func readString(_ selector: UInt32, on object: AudioObjectID) -> String? {
        var address = address(for: selector)
        var value: Unmanaged<CFString>?
        let expected = UInt32(MemoryLayout.size(ofValue: value))
        var size: UInt32 = 0
        guard AudioObjectHasProperty(object, &address),
              AudioObjectGetPropertyDataSize(object, &address, 0, nil, &size) == noErr,
              size == expected,
              AudioObjectGetPropertyData(object, &address, 0, nil, &size, &value) == noErr
        else { return nil }
        let string = value?.takeRetainedValue() as String?
        return size == expected ? string : nil
    }
}
