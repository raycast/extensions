import AppKit

/// A key starts untested, turns "pressed" for as long as it's held, and
/// once released becomes "tested" until the board is reset. `nonTestable`
/// is a fourth, permanent state for slots with no OS-visible keycode at
/// all (layer keys, unbound positions) — imported custom-keyboard layouts
/// need it so a layer key doesn't read as a dead key.
enum KeyState {
    case untested
    case pressed
    case tested
    case nonTestable
}

final class KeyView: NSView {
    let keycode: Int?
    private let label: NSTextField
    private(set) var state: KeyState

    init(definition: KeyDefinition, frame: NSRect) {
        self.keycode = definition.keycode
        self.state = definition.keycode == nil ? .nonTestable : .untested
        self.label = NSTextField(labelWithString: definition.label)
        super.init(frame: frame)

        wantsLayer = true
        layer?.cornerRadius = 6
        layer?.borderWidth = 1

        label.font = NSFont.systemFont(ofSize: min(12, frame.height * 0.32), weight: .medium)
        label.alignment = .center
        label.textColor = definition.keycode == nil ? .tertiaryLabelColor : .labelColor
        // Imported custom-keyboard labels vary in length (e.g. "Mission
        // Control") — truncate rather than overflow the key's bounds, since
        // an unverified default label like "escape" instead of "esc" is
        // exactly the kind of thing a converted board can produce.
        label.lineBreakMode = .byTruncatingTail
        label.cell?.truncatesLastVisibleLine = true
        label.maximumNumberOfLines = 1
        label.translatesAutoresizingMaskIntoConstraints = false
        addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: centerXAnchor),
            label.centerYAnchor.constraint(equalTo: centerYAnchor),
            label.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor, constant: -4),
        ])

        apply(state)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func set(_ newState: KeyState) {
        guard state != .nonTestable else { return }
        // pressed -> tested is the only forward transition once released;
        // tested keys ignore further "untested" (that only happens on reset).
        guard newState != state else { return }
        if state == .tested && newState == .untested { return }
        state = newState
        apply(newState)
    }

    func resetToUntested() {
        guard state != .nonTestable else { return }
        state = .untested
        apply(.untested)
    }

    private func apply(_ state: KeyState) {
        switch state {
        case .untested:
            layer?.backgroundColor = NSColor.white.withAlphaComponent(0.10).cgColor
            layer?.borderColor = NSColor.white.withAlphaComponent(0.28).cgColor
            layer?.borderWidth = 1
        case .pressed:
            layer?.backgroundColor = NSColor.controlAccentColor.withAlphaComponent(0.9).cgColor
            layer?.borderColor = NSColor.controlAccentColor.cgColor
            layer?.borderWidth = 1
        case .tested:
            // Low-alpha systemMint reads as a tint on the HUD material rather
            // than a flat colored patch, and sits next to controlAccentColor
            // (usually blue) without the hue clash a saturated systemGreen has.
            layer?.backgroundColor = NSColor.systemMint.withAlphaComponent(0.24).cgColor
            layer?.borderColor = NSColor.systemMint.withAlphaComponent(0.55).cgColor
            layer?.borderWidth = 1
        case .nonTestable:
            // Deliberately quiet and colorless — this isn't a fourth "loud"
            // state to compete with pressed/tested, just a visual note that
            // there's nothing to test here (no fill, dim dashed-looking
            // border via low alpha + no glow).
            layer?.backgroundColor = NSColor.clear.cgColor
            layer?.borderColor = NSColor.white.withAlphaComponent(0.08).cgColor
            layer?.borderWidth = 1
        }
    }
}
