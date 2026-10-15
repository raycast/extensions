// JSON for the helper's protocol: a value type with a byte writer (a walk reply can hold 100k files, and
// JSONSerialization is slow on that), and typed access to a request's arguments.
import Foundation

enum JSON: ExpressibleByStringLiteral, ExpressibleByIntegerLiteral, ExpressibleByFloatLiteral,
           ExpressibleByBooleanLiteral, ExpressibleByNilLiteral, ExpressibleByArrayLiteral,
           ExpressibleByDictionaryLiteral {
    case null
    case bool(Bool)
    case int(Int)
    case double(Double)
    case string(String)
    case array([JSON])
    case object([String: JSON])

    init(stringLiteral value: String) { self = .string(value) }
    init(integerLiteral value: Int) { self = .int(value) }
    init(floatLiteral value: Double) { self = .double(value) }
    init(booleanLiteral value: Bool) { self = .bool(value) }
    init(nilLiteral: ()) { self = .null }
    init(arrayLiteral elements: JSON...) { self = .array(elements) }
    init(dictionaryLiteral elements: (String, JSON)...) {
        self = .object(Dictionary(elements, uniquingKeysWith: { _, last in last }))
    }

    static func optional(_ value: String?) -> JSON { value.map { .string($0) } ?? .null }

    func write(into out: inout [UInt8]) {
        switch self {
        case .null: out.append(contentsOf: "null".utf8)
        case .bool(let value): out.append(contentsOf: (value ? "true" : "false").utf8)
        case .int(let value): out.append(contentsOf: String(value).utf8)
        case .double(let value):
            guard value.isFinite else { return out.append(contentsOf: "null".utf8) }
            out.append(contentsOf: (value == value.rounded() && abs(value) < 1e15 ? String(Int(value)) : "\(value)").utf8)
        case .string(let value): JSON.write(string: value, into: &out)
        case .array(let values):
            out.append(0x5B)
            for (index, value) in values.enumerated() {
                if index > 0 { out.append(0x2C) }
                value.write(into: &out)
            }
            out.append(0x5D)
        case .object(let members):
            out.append(0x7B)
            var first = true
            for (key, value) in members {
                if !first { out.append(0x2C) }
                first = false
                JSON.write(string: key, into: &out)
                out.append(0x3A)
                value.write(into: &out)
            }
            out.append(0x7D)
        }
    }

    private static func write(string: String, into out: inout [UInt8]) {
        out.append(0x22)
        for byte in string.utf8 {
            switch byte {
            case 0x22: out.append(contentsOf: [0x5C, 0x22])
            case 0x5C: out.append(contentsOf: [0x5C, 0x5C])
            case 0x0A: out.append(contentsOf: [0x5C, 0x6E])
            case 0x0D: out.append(contentsOf: [0x5C, 0x72])
            case 0x09: out.append(contentsOf: [0x5C, 0x74])
            case 0..<0x20:
                out.append(contentsOf: Array(String(format: "\\u%04x", byte).utf8))
            default: out.append(byte)
            }
        }
        out.append(0x22)
    }
}

/// A request's arguments, read with the types the protocol promises. A wrong type is a failed request, not a crash.
struct Args {
    let raw: [String: Any]

    func string(_ key: String) throws -> String {
        guard let value = raw[key] as? String else { throw HelperFailure("missing text argument '\(key)'") }
        return value
    }

    func optString(_ key: String) -> String? { raw[key] as? String }

    func int(_ key: String, _ fallback: Int? = nil) throws -> Int {
        if let value = raw[key] as? NSNumber { return value.intValue }
        if let fallback { return fallback }
        throw HelperFailure("missing number argument '\(key)'")
    }

    func double(_ key: String, _ fallback: Double? = nil) throws -> Double {
        if let value = raw[key] as? NSNumber { return value.doubleValue }
        if let fallback { return fallback }
        throw HelperFailure("missing number argument '\(key)'")
    }

    /// A count or size that must be above zero: zero or a negative value would trap or loop in the readers.
    func positiveInt(_ key: String, _ fallback: Int? = nil, max: Int = 1 << 16) throws -> Int {
        let value = try int(key, fallback)
        guard value > 0, value <= max else { throw HelperFailure("'\(key)' must be between 1 and \(max)") }
        return value
    }

    /// Seconds (a window, a step) that must be above zero and finite.
    func positiveDouble(_ key: String, _ fallback: Double? = nil) throws -> Double {
        let value = try double(key, fallback)
        guard value.isFinite, value > 0, value < 1e9 else { throw HelperFailure("'\(key)' must be a positive number") }
        return value
    }

    func optDouble(_ key: String) -> Double? { (raw[key] as? NSNumber)?.doubleValue }
    func optInt(_ key: String) -> Int? { (raw[key] as? NSNumber)?.intValue }

    func bool(_ key: String, _ fallback: Bool = false) -> Bool {
        (raw[key] as? NSNumber)?.boolValue ?? fallback
    }

    func strings(_ key: String) -> [String] { raw[key] as? [String] ?? [] }
    func numbers(_ key: String) -> [Double]? { (raw[key] as? [NSNumber])?.map(\.doubleValue) }
}

/// A request that can't be done: its message goes back as `error`.
struct HelperFailure: Error, CustomStringConvertible {
    let message: String
    init(_ message: String) { self.message = message }
    var description: String { message }
}

/// DigUp: Extractors.swift ExtractError, with its wording (the index shows these as a file's detail).
enum ExtractError: Error, CustomStringConvertible {
    case unreadable(String)
    case tooSmall(Int, Int)
    case locked

    var description: String {
        switch self {
        case .unreadable(let why): "unreadable: \(why)"
        case .tooSmall(let width, let height): "small image \(width)×\(height)"
        case .locked: "password-protected"
        }
    }
}

func log(_ message: String) {
    FileHandle.standardError.write(Data("digup-helper: \(message)\n".utf8))
}
