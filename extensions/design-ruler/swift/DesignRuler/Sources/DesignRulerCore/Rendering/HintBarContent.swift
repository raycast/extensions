import SwiftUI

// MARK: - Mode

package enum HintBarMode {
    case inspect
    case alignmentGuides
}

// MARK: - Shared Text Style

/// Shared text styling for all hint bar content views.
private struct HintBarTextStyle {
    let isDark: Bool

    var escTint: Color {
        isDark
            ? Color(nsColor: NSColor(srgbRed: 0xFF / 255.0, green: 0xB2 / 255.0, blue: 0xB2 / 255.0, alpha: 1))
            : Color(nsColor: NSColor(srgbRed: 0x80 / 255.0, green: 0, blue: 0, alpha: 1))
    }

    var escTintFill: Color {
        Color(nsColor: NSColor(srgbRed: 1, green: 0, blue: 0, alpha: 0.1))
    }

    func text(_ string: String) -> Text {
        Text(string)
            .font(.system(size: 16, weight: .semibold))
            .tracking(-0.48)
            .foregroundColor(isDark ? .white : .black)
    }

    func exitText(_ string: String) -> Text {
        Text(string)
            .font(.system(size: 16, weight: .semibold))
            .tracking(-0.48)
            .foregroundColor(escTint)
    }
}

// MARK: - Observable State

package final class HintBarState: ObservableObject {
    @Published package var pressedKeys: Set<HintBarView.KeyID> = []
    @Published package var isOnLightBackground: Bool = false
    @Published package var isCollapsed: Bool = false
    @Published package var mode: HintBarMode = .inspect
    @Published package var zoomFlashText: String? = nil
    private var flashWorkItem: DispatchWorkItem?

    package init() {}

    /// Whether the current flash represents zooming in (x2, x4) vs out (x1).
    package var isZoomingIn: Bool {
        zoomFlashText == "x2" || zoomFlashText == "x4"
    }

    package func flashZoomLevel(_ level: ZoomLevel) {
        flashWorkItem?.cancel()

        let text: String
        switch level {
        case .one:  text = "x1"
        case .two:  text = "x2"
        case .four: text = "x4"
        }

        zoomFlashText = text

        let revert = DispatchWorkItem { [weak self] in
            self?.zoomFlashText = nil
        }
        flashWorkItem = revert
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: revert)
    }
}

// MARK: - Root Content

package struct HintBarContent: View {
    @ObservedObject package var state: HintBarState

    private var style: HintBarTextStyle { HintBarTextStyle(isDark: !state.isOnLightBackground) }

    package var body: some View {
        if state.mode == .inspect {
            HStack(spacing: 6) {
                style.text("Use")
                ArrowCluster(state: state)
                style.text("to skip edges, plus")
                KeyCap(.shift, symbol: "\u{21E7}", width: 40, height: 25,
                       symbolFont: .system(size: 16, weight: .bold, design: .rounded),
                       symbolTracking: -0.2, align: .bottomLeading, state: state)
                style.text("to reverse.")
                ZoomKeyCap(state: state)
                style.text("Toggle zoom")
                KeyCap(.esc, symbol: "esc", width: 32, height: 25,
                       symbolFont: .system(size: 13, weight: .bold, design: .rounded),
                       symbolTracking: -0.2, align: .center, state: state,
                       tint: style.escTint, tintFill: style.escTintFill)
                style.exitText("to exit.")
            }
            .padding(.horizontal, 16)
            .frame(height: 48)
        } else {
            HStack(spacing: 6) {
                style.text("Press")
                KeyCap(.tab, symbol: "⇥", width: 40, height: 25,
                       symbolFont: .system(size: 13, weight: .bold, design: .rounded),
                       symbolTracking: -0.2, align: .center, state: state)
                style.text("to switch direction,")
                KeyCap(.space, symbol: "space", width: 64, height: 25,
                       symbolFont: .system(size: 12, weight: .bold, design: .rounded),
                       symbolTracking: -0.2, align: .center, state: state)
                style.text("to change color.")
                ZoomKeyCap(state: state)
                style.text("Toggle zoom")
                KeyCap(.esc, symbol: "esc", width: 32, height: 25,
                       symbolFont: .system(size: 13, weight: .bold, design: .rounded),
                       symbolTracking: -0.2, align: .center, state: state,
                       tint: style.escTint, tintFill: style.escTintFill)
                style.exitText("to exit.")
            }
            .padding(.horizontal, 16)
            .frame(height: 48)
        }
    }
}

// MARK: - Collapsed Content Views

package struct CollapsedLeftContent: View {
    @ObservedObject package var state: HintBarState

    package var body: some View {
        HStack(spacing: 6) {
            ArrowCluster(state: state)
            KeyCap(.shift, symbol: "\u{21E7}", width: 40, height: 25,
                   symbolFont: .system(size: 16, weight: .bold, design: .rounded),
                   symbolTracking: -0.2, align: .bottomLeading, state: state)
            ZoomKeyCap(state: state)
        }
        .padding(.horizontal, 10)
        .frame(height: 48)
    }
}

package struct CollapsedAlignmentGuidesLeftContent: View {
    @ObservedObject package var state: HintBarState

    package var body: some View {
        HStack(spacing: 6) {
            KeyCap(.tab, symbol: "⇥", width: 40, height: 25,
                   symbolFont: .system(size: 13, weight: .bold, design: .rounded),
                   symbolTracking: -0.2, align: .center, state: state)
            KeyCap(.space, symbol: "space", width: 64, height: 25,
                   symbolFont: .system(size: 12, weight: .bold, design: .rounded),
                   symbolTracking: -0.2, align: .center, state: state)
            ZoomKeyCap(state: state)
        }
        .padding(.horizontal, 10)
        .frame(height: 48)
    }
}

package struct CollapsedRightContent: View {
    @ObservedObject package var state: HintBarState

    private var style: HintBarTextStyle { HintBarTextStyle(isDark: !state.isOnLightBackground) }

    package var body: some View {
        KeyCap(.esc, symbol: "esc", width: 32, height: 25,
               symbolFont: .system(size: 13, weight: .bold, design: .rounded),
               symbolTracking: -0.2, align: .center, state: state,
               tint: style.escTint, tintFill: style.escTintFill)
            .padding(.horizontal, 10)
            .frame(height: 48)
    }
}

// MARK: - Glass Morph Root (macOS 26+)

@available(macOS 26.0, *)
package struct HintBarGlassRoot: View {
    @ObservedObject package var state: HintBarState
    @Namespace private var morphNS

    private var style: HintBarTextStyle { HintBarTextStyle(isDark: !state.isOnLightBackground) }

    package var body: some View {
        ZStack {
            // Bottom: glass morph — text visible, keycaps invisible (sizing only)
            glassLayer
            // Top: keycap slide — keycaps visible, text invisible (spacing only)
            keycapLayer
        }
    }

    /// Glass background + visible text. Uses if/else branching so glassEffectID
    /// can morph one bar into two. Keycaps are `.opacity(0)` placeholders for sizing.
    private var glassLayer: some View {
        GlassEffectContainer {
            if !state.isCollapsed {
                if state.mode == .inspect {
                    HStack(spacing: 6) {
                        style.text("Use")
                        ArrowCluster(state: state).opacity(0)
                        style.text("to skip edges, plus")
                        shiftCap.opacity(0)
                        style.text("to reverse.")
                        zoomCap.opacity(0)
                        style.text("Toggle zoom")
                        escCap.opacity(0)
                        style.exitText("to exit.")
                    }
                    .padding(.horizontal, 16)
                    .frame(height: 48)
                    .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .glassEffectID("bar", in: morphNS)
                } else {
                    HStack(spacing: 6) {
                        style.text("Press")
                        tabCap.opacity(0)
                        style.text("to switch direction,")
                        spaceCap.opacity(0)
                        style.text("to change color.")
                        zoomCap.opacity(0)
                        style.text("Toggle zoom")
                        escCap.opacity(0)
                        style.exitText("to exit.")
                    }
                    .padding(.horizontal, 16)
                    .frame(height: 48)
                    .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .glassEffectID("bar", in: morphNS)
                }
            } else {
                HStack(spacing: 8) {
                    if state.mode == .inspect {
                        HStack(spacing: 6) {
                            ArrowCluster(state: state).opacity(0)
                            shiftCap.opacity(0)
                            zoomCap.opacity(0)
                        }
                        .padding(.horizontal, 10)
                        .frame(height: 48)
                        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .glassEffectID("left", in: morphNS)
                    } else {
                        HStack(spacing: 6) {
                            tabCap.opacity(0)
                            spaceCap.opacity(0)
                            zoomCap.opacity(0)
                        }
                        .padding(.horizontal, 10)
                        .frame(height: 48)
                        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .glassEffectID("left", in: morphNS)
                    }

                    escCap.opacity(0)
                        .padding(.horizontal, 10)
                        .frame(height: 48)
                        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .glassEffectID("right", in: morphNS)
                }
            }
        }
    }

    /// Visible keycaps in a single stable view tree (no if/else around keycaps).
    /// Text is `.opacity(0)` for spacing; when removed, keycaps slide together.
    private var keycapLayer: some View {
        HStack(spacing: state.isCollapsed ? 8 : 6) {
            if state.mode == .inspect {
                HStack(spacing: 6) {
                    if !state.isCollapsed {
                        style.text("Use").opacity(0)
                    }
                    ArrowCluster(state: state)
                    if !state.isCollapsed {
                        style.text("to skip edges, plus").opacity(0)
                    }
                    shiftCap
                    if !state.isCollapsed {
                        style.text("to reverse.").opacity(0)
                    }
                    zoomCap
                    if !state.isCollapsed {
                        style.text("Toggle zoom").opacity(0)
                    }
                }
                .padding(.horizontal, state.isCollapsed ? 10 : 0)
            } else {
                HStack(spacing: 6) {
                    if !state.isCollapsed {
                        style.text("Press").opacity(0)
                    }
                    tabCap
                    if !state.isCollapsed {
                        style.text("to switch direction,").opacity(0)
                    }
                    spaceCap
                    if !state.isCollapsed {
                        style.text("to change color.").opacity(0)
                    }
                    zoomCap
                    if !state.isCollapsed {
                        style.text("Toggle zoom").opacity(0)
                    }
                }
                .padding(.horizontal, state.isCollapsed ? 10 : 0)
            }

            HStack(spacing: 6) {
                escCap
                if !state.isCollapsed {
                    style.exitText("to exit.").opacity(0)
                }
            }
            .padding(.horizontal, state.isCollapsed ? 10 : 0)
        }
        .padding(.horizontal, state.isCollapsed ? 0 : 16)
        .frame(height: 48)
    }

    // MARK: - Shared keycap builders

    private var shiftCap: some View {
        KeyCap(.shift, symbol: "\u{21E7}", width: 40, height: 25,
               symbolFont: .system(size: 16, weight: .bold, design: .rounded),
               symbolTracking: -0.2, align: .bottomLeading, state: state)
    }

    private var tabCap: some View {
        KeyCap(.tab, symbol: "⇥", width: 40, height: 25,
               symbolFont: .system(size: 13, weight: .bold, design: .rounded),
               symbolTracking: -0.2, align: .center, state: state)
    }

    private var spaceCap: some View {
        KeyCap(.space, symbol: "space", width: 64, height: 25,
               symbolFont: .system(size: 12, weight: .bold, design: .rounded),
               symbolTracking: -0.2, align: .center, state: state)
    }

    private var zoomCap: some View {
        ZoomKeyCap(state: state)
    }

    private var escCap: some View {
        KeyCap(.esc, symbol: "esc", width: 32, height: 25,
               symbolFont: .system(size: 13, weight: .bold, design: .rounded),
               symbolTracking: -0.2, align: .center, state: state,
               tint: style.escTint, tintFill: style.escTintFill)
    }
}

// MARK: - Arrow Cluster

private struct ArrowCluster: View {
    @ObservedObject var state: HintBarState

    private let capW: CGFloat = 26
    private let capH: CGFloat = 11
    private let hGap: CGFloat = 1
    private let vGap: CGFloat = 2

    var body: some View {
        let font = Font.system(size: 7, weight: .bold, design: .rounded)
        VStack(spacing: vGap) {
            KeyCap(.up, symbol: "\u{25B2}", width: capW, height: capH,
                   symbolFont: font, symbolTracking: 0, align: .center, state: state)
                .offset(y: 1)
            HStack(spacing: hGap) {
                KeyCap(.left, symbol: "\u{25C0}\u{FE0E}", width: capW, height: capH,
                       symbolFont: font, symbolTracking: 0, align: .center, state: state)
                KeyCap(.down, symbol: "\u{25BC}", width: capW, height: capH,
                       symbolFont: font, symbolTracking: 0, align: .center, state: state)
                KeyCap(.right, symbol: "\u{25B6}\u{FE0E}", width: capW, height: capH,
                       symbolFont: font, symbolTracking: 0, align: .center, state: state)
            }
        }
    }
}

// MARK: - Zoom Key Cap

private struct ZoomKeyCap: View {
    @ObservedObject var state: HintBarState

    var body: some View {
        let isDark = !state.isOnLightBackground
        let accentColor: Color = isDark ? .white : .black
        let normalColor: Color = isDark
            ? Color(nsColor: NSColor(srgbRed: 0x44 / 255.0, green: 0x44 / 255.0, blue: 0x44 / 255.0, alpha: 1))
            : Color(nsColor: NSColor(srgbRed: 0xDD / 255.0, green: 0xDD / 255.0, blue: 0xDD / 255.0, alpha: 1))
        let pressedColor: Color = isDark
            ? Color(nsColor: NSColor(srgbRed: 0x2C / 255.0, green: 0x2C / 255.0, blue: 0x2C / 255.0, alpha: 1))
            : Color(nsColor: NSColor(srgbRed: 0xAA / 255.0, green: 0xAA / 255.0, blue: 0xAA / 255.0, alpha: 1))
        let isPressed = state.pressedKeys.contains(.zoom)
        let cornerRadius: CGFloat = 5
        let shadowOffset: CGFloat = 2
        let width: CGFloat = 25
        let height: CGFloat = 25
        let font: Font = .system(size: 13, weight: .bold, design: .rounded)

        ZStack(alignment: .bottom) {
            // Shadow rect
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(accentColor)
                .frame(width: width, height: height)
                .opacity(isPressed ? 0 : 1)

            // Cap
            ZStack {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(isPressed ? pressedColor : normalColor)
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(accentColor, lineWidth: 1.5)

                // ZStack for flash animation: "Z" and zoom level text
                ZStack {
                    Text("Z")
                        .font(font)
                        .foregroundColor(accentColor)
                        .scaleEffect(state.zoomFlashText == nil ? 1.0 : 0.6)
                        .blur(radius: state.zoomFlashText == nil ? 0 : 4)
                        .opacity(state.zoomFlashText == nil ? 1 : 0)

                    if let flashText = state.zoomFlashText {
                        Text(flashText)
                            .font(font)
                            .foregroundColor(accentColor)
                            .transition(.asymmetric(
                                insertion: .scale(scale: state.isZoomingIn ? 0.6 : 1.4).combined(with: .opacity),
                                removal: .scale(scale: 0.8).combined(with: .opacity)
                            ))
                    }
                }
                .animation(.easeOut(duration: 0.2), value: state.zoomFlashText)
            }
            .frame(width: width, height: height)
            .offset(y: isPressed ? 0 : -shadowOffset)
        }
        .frame(width: width, height: height + shadowOffset)
        .animation(.easeOut(duration: 0.06), value: isPressed)
    }
}

// MARK: - Key Cap

private struct KeyCap: View {
    enum Align { case center, bottomLeading, bottomTrailing }

    let id: HintBarView.KeyID
    let symbol: String
    let width: CGFloat
    let height: CGFloat
    let symbolFont: Font
    let symbolTracking: CGFloat
    let align: Align
    let tint: Color?
    let tintFill: Color?
    @ObservedObject var state: HintBarState

    private let cornerRadius: CGFloat = 5
    private let borderWidth: CGFloat = 1.5
    private let shadowOffset: CGFloat = 2

    private var isDark: Bool { !state.isOnLightBackground }

    private var normalColor: Color {
        isDark
            ? Color(nsColor: NSColor(srgbRed: 0x44 / 255.0, green: 0x44 / 255.0, blue: 0x44 / 255.0, alpha: 1))
            : Color(nsColor: NSColor(srgbRed: 0xDD / 255.0, green: 0xDD / 255.0, blue: 0xDD / 255.0, alpha: 1))
    }
    private var pressedColor: Color {
        isDark
            ? Color(nsColor: NSColor(srgbRed: 0x2C / 255.0, green: 0x2C / 255.0, blue: 0x2C / 255.0, alpha: 1))
            : Color(nsColor: NSColor(srgbRed: 0xAA / 255.0, green: 0xAA / 255.0, blue: 0xAA / 255.0, alpha: 1))
    }

    private var accentColor: Color { tint ?? (isDark ? .white : .black) }

    init(_ id: HintBarView.KeyID, symbol: String, width: CGFloat, height: CGFloat,
         symbolFont: Font, symbolTracking: CGFloat, align: Align, state: HintBarState,
         tint: Color? = nil, tintFill: Color? = nil) {
        self.id = id
        self.symbol = symbol
        self.width = width
        self.height = height
        self.symbolFont = symbolFont
        self.symbolTracking = symbolTracking
        self.align = align
        self.tint = tint
        self.tintFill = tintFill
        self._state = ObservedObject(wrappedValue: state)
    }

    private var isPressed: Bool { state.pressedKeys.contains(id) }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Shadow rect (sits at the bottom for 3D depth)
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(accentColor)
                .frame(width: width, height: height)
                .opacity(isPressed ? 0 : 1)

            // Cap (elevated when not pressed, drops down when pressed)
            ZStack {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(isPressed ? pressedColor : normalColor)
                if let tintFill {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(tintFill)
                }
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(accentColor, lineWidth: borderWidth)
                capLabel
            }
            .frame(width: width, height: height)
            .offset(y: isPressed ? 0 : -shadowOffset)
        }
        .frame(width: width, height: height + shadowOffset)
        .animation(.easeOut(duration: 0.06), value: isPressed)
    }

    @ViewBuilder
    private var capLabel: some View {
        if id == .tab {
            // Composite tab symbol: arrow + pipe at bottom-left
            HStack(spacing: 0) {
                Text("\u{2192}")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(accentColor)
                Text("|")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(accentColor)
                    .offset(x: -2, y: -0.5)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
            .padding(.leading, 3)
            .padding(.bottom, 1)
        } else {
            let label = Text(symbol)
                .font(symbolFont)
                .tracking(symbolTracking)
                .foregroundColor(accentColor)

            switch align {
            case .center:
                label
            case .bottomLeading:
                label
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    .padding(.leading, 3)
                    .padding(.bottom, 1)
            case .bottomTrailing:
                label
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .padding(.trailing, 3)
                    .padding(.bottom, 1)
            }
        }
    }
}
