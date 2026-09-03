import Foundation
import IOKit.hid

final class DeviceMonitor: @unchecked Sendable {
    private let manager: IOHIDManager
    private let transformer: ScrollTransformer?

    init(transformer: ScrollTransformer? = nil) {
        self.transformer = transformer
        manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
        let match: [String: Any] = [
            kIOHIDDeviceUsagePageKey: kHIDPage_GenericDesktop,
            kIOHIDDeviceUsageKey: kHIDUsage_GD_Mouse,
        ]
        IOHIDManagerSetDeviceMatching(manager, match as CFDictionary)
    }

    func devices() -> [DeviceIdentity] {
        IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        defer { IOHIDManagerClose(manager, IOOptionBits(kIOHIDOptionsTypeNone)) }
        guard let set = IOHIDManagerCopyDevices(manager) as? Set<IOHIDDevice> else { return [] }
        return set.map(DeviceIdentity.init(device:)).sorted {
            let byName = $0.name.localizedCaseInsensitiveCompare($1.name)
            return byName == .orderedSame ? $0.key < $1.key : byName == .orderedAscending
        }
    }

    func start() throws {
        guard transformer != nil else { return }
        IOHIDManagerRegisterInputValueCallback(manager, { context, result, _, value in
            guard result == kIOReturnSuccess, let context else { return }
            Unmanaged<DeviceMonitor>.fromOpaque(context).takeUnretainedValue().handle(value)
        }, Unmanaged.passUnretained(self).toOpaque())
        IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue)
        let result = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        guard result == kIOReturnSuccess else { throw HelperError.hidOpen(result) }
    }

    private func handle(_ value: IOHIDValue) {
        guard IOHIDValueGetIntegerValue(value) != 0 else { return }
        let element = IOHIDValueGetElement(value)
        let device = IOHIDElementGetDevice(element)
        let page = IOHIDElementGetUsagePage(element)
        let usage = IOHIDElementGetUsage(element)
        let axis: ScrollAxis?
        if page == kHIDPage_GenericDesktop && usage == kHIDUsage_GD_Wheel {
            axis = .vertical
        } else if page == kHIDPage_Consumer && usage == kHIDUsage_Csmr_ACPan {
            axis = .horizontal
        } else {
            axis = nil
        }
        guard let axis else { return }
        transformer?.record(device: DeviceIdentity(device: device), axis: axis, hidTimestamp: IOHIDValueGetTimeStamp(value))
    }
}

enum HelperError: LocalizedError {
    case hidOpen(IOReturn)
    case eventTapUnavailable

    var errorDescription: String? {
        switch self {
        case let .hidOpen(code): "Could not open HID manager (\(code))."
        case .eventTapUnavailable: "Could not create the scroll event tap. Grant Input Monitoring and Accessibility access."
        }
    }
}
