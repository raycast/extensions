// Shared with the Dock Cleanup menu bar app: https://github.com/alaramartin/dock-cleanup/blob/main/Sources/DockCleanup/Shared/ConfirmPanel.swift

import AppKit
import SwiftUI

/// The "Quit & remove N apps?" panel shown next to the selection.
final class ConfirmPanel: NSPanel {
    private let onCancel: () -> Void

    init(items: [DockItem], onConfirm: @escaping () -> Void, onCancel: @escaping () -> Void) {
        self.onCancel = onCancel
        super.init(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        level = NSWindow.Level(NSWindow.Level.screenSaver.rawValue + 1)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = true
        isReleasedWhenClosed = false
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        let host = NSHostingView(rootView: ConfirmView(items: items, onConfirm: onConfirm, onCancel: onCancel))
        host.sizingOptions = [.intrinsicContentSize]
        contentView = host
        setContentSize(host.fittingSize)
    }

    override var canBecomeKey: Bool { true }
    override func cancelOperation(_ sender: Any?) { onCancel() }

    /// Puts the panel just outside the Dock edge of the selection, kept on screen.
    func place(near sel: NSRect, on screen: NSScreen?) {
        let vis = (screen ?? NSScreen.main!).frame
        let size = frame.size
        let gap: CGFloat = 14
        var o: NSPoint
        switch Dock.orientation {
        case "left": o = NSPoint(x: sel.maxX + gap, y: sel.midY - size.height / 2)
        case "right": o = NSPoint(x: sel.minX - gap - size.width, y: sel.midY - size.height / 2)
        default: o = NSPoint(x: sel.midX - size.width / 2, y: sel.maxY + gap)
        }
        o.x = min(max(o.x, vis.minX + 8), vis.maxX - size.width - 8)
        o.y = min(max(o.y, vis.minY + 8), vis.maxY - size.height - 8)
        setFrameOrigin(o)
    }
}

private struct ConfirmView: View {
    let items: [DockItem]
    let onConfirm: () -> Void
    let onCancel: () -> Void

    private var title: String {
        let n = items.count
        let noun = n == 1 ? items[0].title : "\(n) apps"
        return items.contains(where: \.isRunning) ? "Quit and remove \(noun)?" : "Remove \(noun) from the Dock?"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .lineLimit(1)
            if items.count > 1 {
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(58), spacing: 6), count: min(items.count, 8)),
                          alignment: .leading, spacing: 8) {
                    ForEach(items.indices, id: \.self) { i in
                        VStack(spacing: 3) {
                            Image(nsImage: items[i].icon)
                                .resizable()
                                .frame(width: 36, height: 36)
                            Text(items[i].title)
                                .font(.system(size: 10))
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .foregroundStyle(.secondary)
                        }
                        .frame(width: 58)
                        .help(items[i].title)
                    }
                }
            }
            HStack(spacing: 8) {
                Spacer(minLength: 0)
                Button("Cancel", action: onCancel)
                    .keyboardShortcut(.cancelAction)
                Button(items.contains(where: \.isRunning) ? "Quit & Remove" : "Remove", action: onConfirm)
                    .keyboardShortcut(.defaultAction)
            }
            .controlSize(.regular)
        }
        .padding(16)
        .frame(minWidth: 260)
        .fixedSize()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(.primary.opacity(0.1)))
    }
}
