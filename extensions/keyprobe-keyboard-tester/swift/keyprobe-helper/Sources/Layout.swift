import Foundation

/// A single key's position on the rendered board, in "u" units (1u = one
/// standard keycap). `keycode` is a macOS virtual keycode (`CGKeyCode`),
/// not a matrix row/column, so any board definition can be converted to
/// this shape independently of how its firmware assigns keys.
/// `keycode` is nil for slots that never produce an OS keyDown/keyUp on
/// their own — layer keys, unbound positions, and similar. Those still
/// occupy board space but must render as permanently non-testable rather
/// than "untested", or a layer key reads as a dead key.
struct KeyDefinition: Codable {
    let keycode: Int?
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    let label: String
}

struct Layout: Codable {
    let name: String
    let unit: Double
    let width: Double
    let height: Double
    let keys: [KeyDefinition]

    static func load(from path: String) -> Layout? {
        guard let data = FileManager.default.contents(atPath: path) else { return nil }
        return try? JSONDecoder().decode(Layout.self, from: data)
    }
}
