import Foundation
import IOBluetooth
import RaycastSwiftMacros

let levels: [String: UInt8] = ["off": 0x00, "high": 0x01, "low": 0x03]

struct BoseError: LocalizedError, CustomStringConvertible {
    let description: String
    var errorDescription: String? { description }

    init(_ message: String) {
        description = message
    }
}

final class Session: NSObject, IOBluetoothRFCOMMChannelDelegate {
    var buffer = [UInt8]()

    func rfcommChannelData(_ channel: IOBluetoothRFCOMMChannel!, data: UnsafeMutableRawPointer!, length: Int) {
        buffer += Array(UnsafeBufferPointer(start: data.assumingMemoryBound(to: UInt8.self), count: length))
    }

    func send(_ channel: IOBluetoothRFCOMMChannel, _ bytes: [UInt8]) throws {
        var payload = bytes
        let result = channel.writeSync(&payload, length: UInt16(payload.count))
        if result != kIOReturnSuccess { throw BoseError("Write failed (\(result))") }
    }

    func waitFor(timeout: TimeInterval = 3, _ match: ([UInt8]) -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if match(buffer) { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
        return match(buffer)
    }
}

func findHeadphones() throws -> (IOBluetoothDevice, BluetoothRFCOMMChannelID) {
    for device in (IOBluetoothDevice.pairedDevices() as? [IOBluetoothDevice]) ?? [] where device.isConnected() {
        for service in (device.services as? [IOBluetoothSDPServiceRecord]) ?? [] where service.getServiceName() == "SPP Dev" {
            var channel: BluetoothRFCOMMChannelID = 0
            if service.getRFCOMMChannelID(&channel) == kIOReturnSuccess { return (device, channel) }
        }
    }
    throw BoseError("No connected Bose headphones found")
}

func levelInStatus(_ bytes: [UInt8]) -> UInt8? {
    guard bytes.count >= 5 else { return nil }
    for i in 0...(bytes.count - 5) where bytes[i] == 0x01 && bytes[i + 1] == 0x06 && bytes[i + 2] == 0x03 {
        return bytes[i + 4]
    }
    return nil
}

func withControlChannel<T>(_ body: (Session, IOBluetoothRFCOMMChannel) throws -> T) throws -> T {
    let (device, channelID) = try findHeadphones()
    let session = Session()
    var channel: IOBluetoothRFCOMMChannel?
    let result = device.openRFCOMMChannelSync(&channel, withChannelID: channelID, delegate: session)
    guard result == kIOReturnSuccess, let channel else { throw BoseError("Could not open control channel (\(result))") }
    defer { channel.close() }

    try session.send(channel, [0x00, 0x01, 0x01, 0x00])
    _ = session.waitFor(timeout: 1) { $0.starts(with: [0x00, 0x01, 0x03]) }
    session.buffer.removeAll()
    return try body(session, channel)
}

@raycast func getLevel() throws -> String {
    try withControlChannel { session, channel in
        try session.send(channel, [0x01, 0x01, 0x05, 0x00])
        guard session.waitFor({ levelInStatus($0) != nil }), let level = levelInStatus(session.buffer),
              let name = levels.first(where: { $0.value == level })?.key
        else { throw BoseError("Could not read noise cancelling level") }
        return name
    }
}

@raycast func setLevel(level name: String) throws {
    guard let level = levels[name] else { throw BoseError("Unknown level \(name)") }
    try withControlChannel { session, channel in
        try session.send(channel, [0x01, 0x06, 0x02, 0x01, level])
        if !session.waitFor({ levelInStatus($0) == level }) { throw BoseError("Headphones did not confirm the change") }
    }
}
