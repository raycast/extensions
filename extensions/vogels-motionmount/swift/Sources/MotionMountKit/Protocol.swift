import Foundation

public struct Position: Equatable, Codable, Sendable {
    public var distance: Int
    public var rotation: Int

    public init(distance: Int, rotation: Int) {
        self.distance = distance
        self.rotation = rotation
    }

    public init?(distance: Data, rotation: Data) {
        guard distance.count >= 2, rotation.count >= 2 else { return nil }
        self.init(distance: Self.int16(distance), rotation: Self.int16(rotation))
    }

    public var encoded: Data {
        Self.bytes(distance) + Self.bytes(rotation)
    }

    public var clamped: Position {
        let distance = min(max(distance, 0), 100)
        return Position(distance: distance, rotation: min(max(rotation, -distance), distance))
    }

    static func int16<D: DataProtocol>(_ data: D) -> Int {
        let bytes = Array(data.prefix(2))
        return Int(Int16(bitPattern: UInt16(bytes[0]) << 8 | UInt16(bytes[1])))
    }

    static func bytes(_ value: Int) -> Data {
        let raw = UInt16(bitPattern: Int16(value))
        return Data([UInt8(raw >> 8), UInt8(raw & 0xff)])
    }
}

public struct Preset: Equatable, Codable, Sendable {
    public var index: Int
    public var name: String
    public var position: Position

    public init(index: Int, name: String, position: Position) {
        self.index = index
        self.name = name
        self.position = position
    }

    public init?(index: Int, part1: Data, part2: Data?) {
        let data = Array(part1 + (part2 ?? Data()))
        guard data.count >= 5 else { return nil }
        let name = String(decoding: data[5...].prefix(32), as: UTF8.self).trimmingCharacters(in: CharacterSet(charactersIn: "\0"))
        guard !name.isEmpty else { return nil }
        self.init(
            index: index,
            name: name,
            position: Position(distance: Position.int16(data[1...2]), rotation: Position.int16(data[3...4]))
        )
    }

    public static func needsSecondPart(_ part1: Data) -> Bool {
        part1.last.map { $0 != 0 } ?? false
    }

    public static let slots = 10
    public static let maxNameBytes = 32
    static let part1Size = 20
    static let part2Size = 17

    public static var cleared: (part1: Data, part2: Data) {
        (Data(count: part1Size), Data(count: part2Size))
    }

    public var encoded: (part1: Data, part2: Data) {
        let data = Data([0x01]) + position.encoded + Self.truncated(name) + Data(count: Self.maxNameBytes)
        return (Data(data.prefix(Self.part1Size)), Data(data.dropFirst(Self.part1Size).prefix(Self.part2Size)))
    }

    public static func firstFreeSlot(among presets: [Preset]) -> Int? {
        let used = Set(presets.map(\.index))
        return (0..<slots).first { !used.contains($0) }
    }

    static func truncated(_ name: String) -> Data {
        var result = Data()
        for character in name {
            let bytes = Data(String(character).utf8)
            guard result.count + bytes.count <= maxNameBytes else { break }
            result += bytes
        }
        return result
    }
}

public enum DiagnosticsState: Equatable, Codable, Sendable {
    case running(step: Int)
    case passed
    case failed(code: Int)

    public static let totalSteps = 15

    public init(byte: UInt8) {
        let value = Int(Int8(bitPattern: byte))
        switch value {
        case 0: self = .passed
        case ..<0: self = .failed(code: value)
        default: self = .running(step: value)
        }
    }
}
