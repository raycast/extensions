import Carbon.HIToolbox
import Foundation

/// Picks which bundled layout JSON to render.
///
/// "auto" reads the *physically attached keyboard's* hardware type via
/// `LMGetKbdType()`/`KBGetLayoutType()` — not the current input source
/// (System Settings language), which is a separate, unrelated setting.
/// This intentionally does NOT help a case like an ANSI-shaped custom
/// keyboard that sends JIS-mapped keycodes over firmware combos: the
/// hardware reports as ANSI, so auto mode shows the ANSI board and the
/// JIS-only presses (英数/かな/¥/_) land in the "unmapped key" readout
/// instead of lighting up a slot. That's why the Raycast preference can
/// force "jis" regardless of what the hardware reports.
///
/// Any mode string other than the built-in ones below is treated as a
/// layout filename stem (e.g. "zoom65" -> zoom65.json) instead of being
/// hardcoded per-board here — search-layout.tsx enumerates whatever JSON
/// files exist in assets/layouts/ and passes the stem straight through,
/// so adding a new board is just "drop the JSON file in", no Swift change.
enum LayoutSelector {
    static func resolve(mode: String, layoutDir: String) -> String {
        let file: String
        switch mode {
        case "auto":
            file = detectHardwareLayoutFile()
        case "ansi":
            file = "ansi.json"
        case "jis":
            file = "jis.json"
        case "iso":
            file = "iso.json"
        default:
            file = "\(mode).json"
        }
        return (layoutDir as NSString).appendingPathComponent(file)
    }

    private static func detectHardwareLayoutFile() -> String {
        let kbdType = LMGetKbdType()
        let layoutType = Int(KBGetLayoutType(Int16(kbdType)))
        switch layoutType {
        case Int(kKeyboardJIS): return "jis.json"
        case Int(kKeyboardISO): return "iso.json"
        default: return "ansi.json"
        }
    }
}
