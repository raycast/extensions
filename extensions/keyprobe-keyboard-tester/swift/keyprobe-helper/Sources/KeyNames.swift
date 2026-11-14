import Foundation

/// macOS virtual keycode -> human-readable name, shared by the log file
/// (EventTap) and the "unmapped key" readout (KeyboardView). Labels match
/// what the on-screen boards use (英数/かな/¥/_/§) so a name here reads the
/// same as it would if you switched to the layout that actually has that
/// key, rather than a separate technical name for the same key.
///
/// Punctuation/letter keys use their ANSI label even though the same
/// keycode is "@"/"^"/":" on a JIS board (see LayoutSelector/README) —
/// this dictionary is only consulted for keys that aren't already showing
/// on the current board, where there's no active-layout label to defer to.
enum KeyNames {
    static func name(for keycode: Int64) -> String {
        table[Int(keycode)] ?? "keycode \(keycode)"
    }

    private static let table: [Int: String] = [
        // Letters
        0: "A", 1: "S", 2: "D", 3: "F", 4: "H", 5: "G", 6: "Z", 7: "X",
        8: "C", 9: "V", 11: "B", 12: "Q", 13: "W", 14: "E", 15: "R", 16: "Y",
        17: "T", 31: "O", 32: "U", 34: "I", 35: "P", 37: "L", 38: "J", 40: "K",
        45: "N", 46: "M",
        // Numbers
        18: "1", 19: "2", 20: "3", 21: "4", 23: "5", 22: "6", 26: "7", 28: "8",
        25: "9", 29: "0",
        // Punctuation (ANSI label)
        24: "=", 27: "-", 30: "]", 33: "[", 39: "'", 41: ";", 42: "\\",
        43: ",", 44: "/", 47: ".", 50: "`",
        // Whitespace / editing
        36: "return", 48: "tab", 49: "space", 51: "delete", 53: "escape",
        76: "keypad enter",
        // Function keys
        122: "F1", 120: "F2", 99: "F3", 118: "F4", 96: "F5", 97: "F6",
        98: "F7", 100: "F8", 101: "F9", 109: "F10", 103: "F11", 111: "F12",
        105: "F13", 107: "F14", 113: "F15", 106: "F16", 64: "F17", 79: "F18",
        80: "F19", 90: "F20",
        // Arrows
        123: "←", 124: "→", 125: "↓", 126: "↑",
        // Navigation cluster
        114: "help", 115: "home", 116: "page up", 117: "forward delete",
        119: "end", 121: "page down",
        // Modifiers
        54: "right command", 55: "left command", 56: "left shift",
        57: "caps lock", 58: "left option", 59: "left control",
        60: "right shift", 61: "right option", 62: "right control", 63: "fn",
        // Keypad
        65: "keypad .", 67: "keypad *", 69: "keypad +", 71: "keypad clear",
        75: "keypad /", 78: "keypad -", 81: "keypad =", 82: "keypad 0",
        83: "keypad 1", 84: "keypad 2", 85: "keypad 3", 86: "keypad 4",
        87: "keypad 5", 88: "keypad 6", 89: "keypad 7", 91: "keypad 8",
        92: "keypad 9",
        // JIS-only
        93: "¥", 94: "_", 95: "keypad ,", 102: "英数", 104: "かな",
        // ISO-only
        10: "§",
    ]
}
