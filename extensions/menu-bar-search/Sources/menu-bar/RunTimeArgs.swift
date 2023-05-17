import Foundation

class RunTimeArgs {
    var clickIndices: [Int]?
    var loadAync = false
    var showAppleMenu = true

    var i = 1 // skip name of program
    var current: String? {
        return i < CommandLine.arguments.count ? CommandLine.arguments[i] : nil
    }

    var options = MenuGetterOptions()

    func advance() {
        i += 1
    }

    func parse() {
        options.maxDepth = 10
        options.maxChildren = 40

        while let arg = current {
            switch arg {
            case "-click":
                advance()
                guard let indices = current?.split(separator: ",").map({ Int($0)! }) else {
                    print("Error: -c requires a comma-separated list of integers")
                    exit(1)
                }
                clickIndices = indices
                advance()
            case "-async":
                advance()
                loadAync = true
            case "-no-apple-menu":
                advance()
                showAppleMenu = false
            default:
                print("Error: unknown argument \(arg)")
                exit(1)
            }
        }
    }
}

func parseToShortcut(from _term: String)->String {
    if !_term.hasPrefix("#") || _term.count < 2 {
        return _term
    }
    var term = String(_term.dropFirst()).split(separator: " ").map(String.init)
    var res = [String]()

    let keys: [(String, String)] = [
        ("ctrl", "⌃"),
        ("alt", "⌥"),
        ("shift", "⇧"),
        ("cmd", "⌘"),
        ("ret", "↩"),
        ("kp_ent", "⌤"),
        ("kp_clr", "⌧"),
        ("tab", "⇥"),
        ("space", "␣"),
        ("del", "⌫"),
        ("esc", "⎋"),
        ("caps", "⇪"),
        ("fn", "fn"),
        ("f1", "F1"),
        ("f2", "F2"),
        ("f3", "F3"),
        ("f4", "F4"),
        ("f5", "F5"),
        ("f6", "F6"),
        ("f7", "F7"),
        ("f8", "F8"),
        ("f9", "F9"),
        ("f10", "F10"),
        ("f11", "F11"),
        ("f12", "F12"),
        ("f13", "F13"),
        ("f14", "F14"),
        ("f15", "F15"),
        ("f16", "F16"),
        ("f17", "F17"),
        ("f18", "F18"),
        ("f19", "F19"),
        ("f20", "F20"),
        ("home", "↖"),
        ("pgup", "⇞"),
        ("fwd_del", "⌦"),
        ("end", "↘"),
        ("pgdn", "⇟"),
        ("left", "◀︎"),
        ("right", "▶︎"),
        ("down", "▼"),
        ("up", "▲")
    ]

    for (keycode, key) in keys {
        if let index = term.firstIndex(of: keycode) {
            res.append(key); term.remove(at: index)
        }
    }

    if !term.isEmpty {
        res.append(term.joined(separator: halfWidthSpace))
    }

    return res.joined(separator: halfWidthSpace)
}