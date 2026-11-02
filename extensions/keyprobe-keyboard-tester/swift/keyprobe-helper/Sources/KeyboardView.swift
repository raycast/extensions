import AppKit

/// Renders a Layout as a grid of KeyViews and routes keycode events to them.
/// Keys with no slot on the board (media keys, unrecognized HID codes)
/// surface as text instead of being silently dropped, since telling
/// "no event" apart from "dead key" is exactly what this tool is for.
final class KeyboardView: NSView {
    // A keycode can map to more than one KeyView on a custom board — e.g. a
    // split keyboard's symmetric thumb clusters both sending space. The OS
    // genuinely can't tell which physical key produced the event, so all
    // slots sharing a keycode highlight together rather than picking one.
    private var viewsByKeycode: [Int: [KeyView]] = [:]
    private let unmappedLabel: NSTextField

    init(layout: Layout, unmappedLabel: NSTextField) {
        self.unmappedLabel = unmappedLabel
        let size = NSSize(width: layout.width * layout.unit, height: layout.height * layout.unit)
        super.init(frame: NSRect(origin: .zero, size: size))

        let gap: CGFloat = 3
        for def in layout.keys {
            let rect = NSRect(
                x: def.x * layout.unit + gap / 2,
                y: size.height - (def.y + def.h) * layout.unit + gap / 2,
                width: def.w * layout.unit - gap,
                height: def.h * layout.unit - gap
            )
            let keyView = KeyView(definition: def, frame: rect)
            addSubview(keyView)
            if let keycode = def.keycode {
                viewsByKeycode[keycode, default: []].append(keyView)
            }
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func handleDown(keycode: Int64) {
        guard let views = viewsByKeycode[Int(keycode)] else {
            unmappedLabel.stringValue = "Unmapped key: \(KeyNames.name(for: keycode)) (keycode \(keycode), not on this layout)"
            return
        }
        for view in views { view.set(.pressed) }
    }

    func handleUp(keycode: Int64) {
        guard let views = viewsByKeycode[Int(keycode)] else { return }
        for view in views { view.set(.tested) }
    }

    func resetAll() {
        for views in viewsByKeycode.values {
            for view in views { view.resetToUntested() }
        }
        unmappedLabel.stringValue = ""
    }
}
