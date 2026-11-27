import AppKit
import Combine
import AVFoundation
import SwiftUI

struct PlayerView: View {
    @ObservedObject var reader: Reader
    let close: () -> Void

    private var action: (title: String, icon: String) {
        switch reader.state {
        case .finished: return ("Replay", "arrow.counterclockwise")
        case .failed: return ("Retry", "arrow.clockwise")
        case .paused: return ("Resume", "play.fill")
        default: return ("Pause", "pause.fill")
        }
    }

    private var width: CGFloat {
        let textWidth = (reader.excerpt as NSString).size(withAttributes: [.font: NSFont.systemFont(ofSize: 16)]).width
        return min(404, max(reader.state == .downloading ? 380 : 340, ceil(textWidth) + 42))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(reader.excerpt)
                .font(.system(size: 16)).lineSpacing(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)

            GeometryReader { track in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.primary.opacity(0.10))
                    Capsule().fill(Color.accentColor.opacity(0.8))
                        .frame(width: track.size.width * min(1, max(0, reader.progress)))
                }
            }.frame(height: 2)
                .accessibilityElement().accessibilityLabel("Reading progress")
                .accessibilityValue(reader.progress.formatted(.percent))

            HStack(spacing: 6) {
                Button { reader.seek(-5) } label: {
                    Label("Back five seconds", systemImage: "gobackward.5").frame(width: 24, height: 24)
                }.disabled(!reader.canSeek).keyboardShortcut(.leftArrow, modifiers: []).help("Back 5 seconds (←)")
                Button(action: reader.toggle) {
                    Label(action.title, systemImage: action.icon).frame(width: 24, height: 24)
                }.disabled(reader.state == .downloading)
                    .keyboardShortcut(.space, modifiers: []).help(action.title + " (Space)")
                Button { reader.seek(5) } label: {
                    Label("Forward five seconds", systemImage: "goforward.5").frame(width: 24, height: 24)
                }.disabled(!reader.canSeek || reader.state == .finished).keyboardShortcut(.rightArrow, modifiers: []).help("Forward 5 seconds (→)")
                if reader.state == .preparing || reader.state == .downloading {
                    Text(reader.state.rawValue).font(.caption).foregroundStyle(.secondary)
                }
                Spacer(minLength: 4)
                Button { reader.changeSpeed(-1) } label: {
                    Label("Speak slower", systemImage: "minus").frame(width: 22, height: 24)
                }.disabled(reader.step == 2).keyboardShortcut("-", modifiers: []).help("Slower (-)")
                Text(String(format: "%g×", Double(reader.step) / 4))
                    .font(.callout.monospacedDigit()).frame(minWidth: 36)
                Button { reader.changeSpeed(1) } label: {
                    Label("Speak faster", systemImage: "plus").frame(width: 22, height: 24)
                }.disabled(reader.step == 8).keyboardShortcut("=", modifiers: []).help("Faster (=)")
                Divider().frame(height: 12).padding(.horizontal, 2)
                Button(action: close) {
                    Label("Close player", systemImage: "xmark").frame(width: 22, height: 24)
                }.keyboardShortcut("w", modifiers: .command).help("Close player (⌘W)")
            }.buttonStyle(.borderless).labelStyle(.iconOnly)
        }
        .padding(.horizontal, 18).padding(.top, 16).padding(.bottom, 10)
        .frame(width: width).fixedSize()
        .ignoresSafeArea()
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    let reader = Reader()
    var panel: NSPanel?
    private var sizing: AnyCancellable?

    func applicationDidFinishLaunching(_ notification: Notification) {
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(control(_:)),
            name: Notification.Name("com.ramimaalouf.raycast.speakplayer.control"), object: nil)
    }

    @objc func control(_ notification: Notification) {
        switch notification.object as? String {
        case "toggle": reader.toggle()
        case "faster": reader.changeSpeed(1)
        case "slower": reader.changeSpeed(-1)
        default: break
        }
    }

    func application(_ sender: NSApplication, open urls: [URL]) {
        guard let url = urls.last else { return }
        do {
            let value = try String(contentsOf: url, encoding: .utf8)
            let dir = url.deletingLastPathComponent()
            let support = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent()
            if dir.deletingLastPathComponent().standardizedFileURL.path == support.standardizedFileURL.path,
               dir.lastPathComponent.hasPrefix("reading-"), ["Selection.txt", "Clipboard.txt"].contains(url.lastPathComponent) {
                try? FileManager.default.removeItem(at: url)
                _ = rmdir(dir.path)
            }
            if panel == nil {
                let window = NSPanel(contentRect: .zero, styleMask: [.titled, .closable, .fullSizeContentView], backing: .buffered, defer: false)
                window.title = "Speak Text"
                window.titleVisibility = .hidden
                window.titlebarAppearsTransparent = true
                window.isMovableByWindowBackground = true
                for button in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] {
                    window.standardWindowButton(button)?.isHidden = true
                }
                let view = PlayerView(reader: reader, close: { [weak window] in window?.close() })
                let host = NSHostingController(rootView: view)
                host.sizingOptions = []
                if #available(macOS 13.3, *) { host.safeAreaRegions = [] }
                window.contentViewController = host
                let measure = { host.sizeThatFits(in: CGSize(width: 404, height: 2000)) }
                window.setContentSize(measure())
                sizing = reader.$excerpt.receive(on: DispatchQueue.main).sink { [weak window] _ in
                    guard let window else { return }
                    host.rootView = view
                    let measured = measure()
                    let size = CGSize(width: ceil(measured.width), height: ceil(measured.height))
                    var frame = window.frame
                    guard frame.size != size else { return }
                    frame.origin.y = frame.maxY - size.height
                    frame.size = size
                    if let screen = window.screen {
                        frame.origin.x = max(screen.visibleFrame.minX, min(frame.minX, screen.visibleFrame.maxX - size.width))
                        frame.origin.y = max(screen.visibleFrame.minY, min(frame.minY, screen.visibleFrame.maxY - size.height))
                    }
                    window.setFrame(frame, display: true)
                }
                window.level = .floating
                window.hidesOnDeactivate = false
                window.collectionBehavior = [.moveToActiveSpace, .fullScreenAuxiliary]
                window.delegate = self
                window.center()
                panel = window
            }
            if let identifier = Bundle.main.bundleIdentifier {
                for previous in NSRunningApplication.runningApplications(withBundleIdentifier: identifier)
                    where previous.processIdentifier != getpid() && previous.bundleURL != Bundle.main.bundleURL {
                    previous.terminate()
                }
            }
            reader.load(value)
            NSApp.activate(ignoringOtherApps: true)
            panel?.makeKeyAndOrderFront(nil)
        } catch {
            NSAlert(error: error).runModal()
            if panel == nil { NSApp.terminate(nil) }
        }
    }

    func windowWillClose(_ notification: Notification) {
        reader.stopPlayback()
        NSApp.terminate(nil)
    }
}

if CommandLine.arguments.count == 5, CommandLine.arguments[1] == "--synthesize",
   let threads = Int32(CommandLine.arguments[3]), let speed = Float(CommandLine.arguments[4]) {
    exit(voice_worker(CommandLine.arguments[2], threads, speed))
}

if CommandLine.arguments.count == 3, CommandLine.arguments[1] == "--control" {
    let identifier = "com.ramimaalouf.raycast.speakplayer"
    let players = NSRunningApplication.runningApplications(withBundleIdentifier: identifier)
    if players.allSatisfy({ $0.processIdentifier == getpid() }) {
        print("idle")
    } else {
        DistributedNotificationCenter.default().postNotificationName(Notification.Name(identifier + ".control"),
            object: CommandLine.arguments[2], userInfo: nil, deliverImmediately: true)
    }
    exit(0)
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
