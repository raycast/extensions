import AppKit
import AVFoundation
import SwiftUI

struct PlayerView: View {
    @ObservedObject var reader: Reader
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(reader.source, systemImage: reader.source == "Clipboard" ? "clipboard" : "text.cursor")
                Spacer()
                Text(reader.state.rawValue)
            }.font(.subheadline).foregroundStyle(.secondary)
            Text(reader.excerpt).font(.system(size: 16)).lineLimit(3)
                .frame(maxWidth: .infinity, minHeight: 60, alignment: .topLeading)
            ProgressView(value: reader.progress).accessibilityLabel("Reading progress")
            HStack {
                Button(action: reader.toggle) {
                    Label(reader.state == .finished ? "Replay" : reader.state == .failed ? "Retry" : reader.state == .paused ? "Resume" : "Pause",
                          systemImage: [.reading, .preparing, .downloading].contains(reader.state) ? "pause.fill" : "play.fill")
                        .frame(minWidth: 72)
                }.disabled(reader.state == .downloading).buttonStyle(.borderedProminent).keyboardShortcut(.space, modifiers: []).help("Space")
                Spacer()
                Button { reader.changeSpeed(-1) } label: { Image(systemName: "minus").frame(width: 18, height: 16) }
                    .disabled(reader.step == 2).keyboardShortcut("-", modifiers: []).accessibilityLabel("Speak slower").help("Slower (-)")
                Text(String(format: "%g×", Double(reader.step) / 4)).monospacedDigit().frame(width: 44)
                Button { reader.changeSpeed(1) } label: { Image(systemName: "plus").frame(width: 18, height: 16) }
                    .disabled(reader.step == 8).keyboardShortcut("=", modifiers: []).accessibilityLabel("Speak faster").help("Faster (=)")
            }
        }.padding(18).frame(width: 366)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    let reader = Reader()
    var panel: NSPanel?

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
                let window = NSPanel(contentRect: .zero, styleMask: [.titled, .closable, .utilityWindow], backing: .buffered, defer: false)
                window.title = "Speak Text"
                window.contentView = NSHostingView(rootView: PlayerView(reader: reader))
                window.setContentSize(window.contentView!.fittingSize)
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
            reader.load(value, source: url.deletingPathExtension().lastPathComponent)
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
