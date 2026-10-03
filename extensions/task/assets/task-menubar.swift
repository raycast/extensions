import AppKit
import Darwin
import Foundation
import SwiftUI

// An extension is a new segment: the finished segment remains in history.
func extendedSession(original: TaskSession, current: TaskSession, minutes: Int, now: Double) throws -> TaskSession {
    guard [5, 10, 15].contains(minutes), current.startedAt == original.startedAt,
          current.status == "finished" else {
        throw NSError(domain: "task", code: 3, userInfo: [NSLocalizedDescriptionKey: "Another task has already started. This session cannot be extended."])
    }
    let start = max(now, original.startedAt + 1)
    return TaskSession(taskName: original.taskName, durationMinutes: minutes,
                       startedAt: start, endsAt: start + Double(minutes) * 60_000, status: "running")
}

struct CompletionCard: View {
    let taskName: String
    let workTime: String
    let dismiss: () -> Void
    let extend: (Int) -> Void
    let menuChanged: (Bool) -> Void
    @State private var menuOpen = false
    @State private var hoveredMinutes: Int?
    private let crimson = Color(red: 0.48, green: 0.12, blue: 0.20)
    static let width: CGFloat = 600
    static let height: CGFloat = 140
    static let expandedHeight: CGFloat = 254

    var body: some View {
        ZStack(alignment: .topLeading) {
            HStack(alignment: .center, spacing: 18) {
                Image(systemName: "stopwatch")
                    .font(.system(size: 33, weight: .ultraLight))
                    .foregroundColor(Color(red: 0.94, green: 0.61, blue: 0.65))
                    .frame(width: 42, height: 50)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Time’s up").font(.system(size: 23, weight: .semibold)).foregroundColor(.white)
                    Text(taskName).font(.system(size: 14)).foregroundColor(.white.opacity(0.85))
                        .lineLimit(2).truncationMode(.tail).help(taskName)
                    Text(workTime).font(.system(size: 13)).foregroundColor(.white.opacity(0.55))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Button(action: dismiss) {
                    Text("Dismiss").frame(width: 98, height: 42)
                        .background(LinearGradient(colors: [Color.white.opacity(0.06), Color.white.opacity(0.015)], startPoint: .top, endPoint: .bottom))
                        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color.white.opacity(0.28), lineWidth: 1))
                        .cornerRadius(11)
                }.buttonStyle(.plain).accessibilityLabel("Dismiss completion notification")
                Button {
                    menuOpen.toggle()
                    hoveredMinutes = nil
                    menuChanged(menuOpen)
                } label: {
                    HStack(spacing: 12) {
                        Text("Extend")
                        Rectangle().fill(Color.white.opacity(0.10)).frame(width: 1, height: 22)
                        Image(systemName: "chevron.down").font(.system(size: 12, weight: .medium))
                    }.frame(width: 116, height: 42)
                        .background(LinearGradient(colors: [crimson.opacity(0.8), Color(red: 0.24, green: 0.06, blue: 0.10)], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .overlay(RoundedRectangle(cornerRadius: 11).stroke(LinearGradient(colors: [Color(red: 0.92, green: 0.43, blue: 0.50).opacity(0.85), crimson.opacity(0.45)], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1))
                        .cornerRadius(11)
                }.buttonStyle(.plain).accessibilityLabel("Extend task")
                    .accessibilityValue(menuOpen ? "Expanded" : "Collapsed")
            }
            .font(.system(size: 15, weight: .medium)).foregroundColor(.white.opacity(0.95))
            .padding(.horizontal, 26)
            .frame(width: Self.width, height: Self.height)
            .background(LinearGradient(stops: [.init(color: crimson.opacity(0.26), location: 0), .init(color: Color.black.opacity(0.14), location: 0.4), .init(color: crimson.opacity(0.22), location: 1)], startPoint: .bottomLeading, endPoint: .topTrailing))
            .background(Color(red: 0.055, green: 0.055, blue: 0.065).opacity(0.65))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(LinearGradient(colors: [Color.white.opacity(0.22), Color(red: 0.84, green: 0.49, blue: 0.55).opacity(0.75), Color.white.opacity(0.12)], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            if menuOpen {
                VStack(spacing: 0) {
                    ForEach([5, 10, 15], id: \.self) { minutes in
                        Button { extend(minutes) } label: {
                            Text("\(minutes) min")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.white.opacity(0.92))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.leading, 18).frame(height: 43)
                                .background(hoveredMinutes == minutes ? crimson.opacity(0.5) : Color.clear)
                                .cornerRadius(9)
                        }.buttonStyle(.plain).onHover { inside in hoveredMinutes = inside ? minutes : nil }
                        if minutes != 15 { Rectangle().fill(Color.white.opacity(0.065)).frame(height: 1).padding(.horizontal, 10) }
                    }
                }
                .padding(4).frame(width: 142)
                .background(CompletionGlass())
                .background(Color(red: 0.10, green: 0.10, blue: 0.12).opacity(0.75))
                .overlay(RoundedRectangle(cornerRadius: 13).stroke(Color.white.opacity(0.22), lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 13))
                .shadow(color: .black.opacity(0.4), radius: 12, y: 7)
                .offset(x: Self.width - 142 - 22, y: 104)
            }
        }
        .frame(width: Self.width, height: menuOpen ? Self.expandedHeight : Self.height, alignment: .topLeading)
        .environment(\.colorScheme, .dark)
    }
}

struct CompletionGlass: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = .hudWindow
        view.blendingMode = .behindWindow
        view.state = .active
        view.appearance = NSAppearance(named: .darkAqua)
        return view
    }
    func updateNSView(_ view: NSVisualEffectView, context: Context) {}
}

struct TaskSession: Codable {
    let taskName: String
    let durationMinutes: Int
    let startedAt: Double
    var endsAt: Double
    var status: String
    var totalPausedMs: Double?
    var pausedAt: Double?
    var pausedRemainingMs: Double?

    func remaining(at now: Double) -> Int {
        if status == "finished" { return 0 }
        let milliseconds = status == "paused" ? (pausedRemainingMs ?? 0) : endsAt - now
        return max(0, Int(ceil(milliseconds / 1000)))
    }

    mutating func pause(at now: Double) {
        guard status == "running", endsAt > now else { return }
        pausedAt = now
        pausedRemainingMs = endsAt - now
        status = "paused"
    }

    mutating func resume(at now: Double) {
        guard status == "paused", let pausedAt else { return }
        let elapsed = max(0, now - pausedAt)
        totalPausedMs = (totalPausedMs ?? 0) + elapsed
        endsAt += elapsed
        self.pausedAt = nil
        pausedRemainingMs = nil
        status = "running"
    }

    mutating func end() {
        status = "finished"
        pausedAt = nil
        pausedRemainingMs = nil
    }
}

func nowMilliseconds() -> Double { floor(Date().timeIntervalSince1970 * 1000) }
func timeLabel(_ seconds: Int) -> String { String(format: "%d:%02d", seconds / 60, seconds % 60) }

func loadSession(_ path: String) throws -> TaskSession {
    let session = try JSONDecoder().decode(TaskSession.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
    guard !session.taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          session.durationMinutes > 0,
          session.endsAt.isFinite,
          session.startedAt.isFinite,
          (session.totalPausedMs ?? 0).isFinite,
          (session.totalPausedMs ?? 0) >= 0,
          session.endsAt == session.startedAt + Double(session.durationMinutes) * 60_000 + (session.totalPausedMs ?? 0),
          ["running", "paused", "finished"].contains(session.status) else {
        throw NSError(domain: "task", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid timer state"])
    }
    if session.status == "paused" {
        guard let pausedAt = session.pausedAt, let remaining = session.pausedRemainingMs,
              pausedAt.isFinite, remaining.isFinite, remaining > 0,
              remaining == session.endsAt - pausedAt else {
            throw NSError(domain: "task", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid paused timer"])
        }
    }
    return session
}

func saveSession(_ session: TaskSession, to path: String) throws {
    try JSONEncoder().encode(session).write(to: URL(fileURLWithPath: path), options: .atomic)
}

struct TaskHistoryEntry: Codable {
    let id: String
    let taskName: String
    let durationMinutes: Int
    let startedAt: Double
    let endedAt: Double
    let actualWorkMs: Double
    let endReason: String

    init(session: TaskSession, reason: String, now: Double) {
        id = String(Int64(session.startedAt))
        taskName = session.taskName
        durationMinutes = session.durationMinutes
        startedAt = session.startedAt
        endedAt = max(now, session.startedAt)
        let cutoff = session.status == "paused" ? (session.pausedAt ?? now) : min(now, session.endsAt)
        actualWorkMs = max(0, min(Double(session.durationMinutes) * 60_000,
                                  cutoff - session.startedAt - (session.totalPausedMs ?? 0)))
        endReason = reason
    }
}

func appendHistory(_ entry: TaskHistoryEntry, statePath: String) throws {
    let file = URL(fileURLWithPath: statePath).deletingLastPathComponent().appendingPathComponent("task-history.json")
    let descriptor = Darwin.open(file.path + ".lock", O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    defer { Darwin.close(descriptor) }
    guard flock(descriptor, LOCK_EX) == 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    defer { flock(descriptor, LOCK_UN) }
    var history: [TaskHistoryEntry] = []
    if FileManager.default.fileExists(atPath: file.path) {
        history = try JSONDecoder().decode([TaskHistoryEntry].self, from: Data(contentsOf: file))
    }
    // Repeated callbacks or a retry after saving state failed cannot add a
    // second record for the same session. Atomic replacement protects readers.
    guard !history.contains(where: { $0.id == entry.id }) else { return }
    history.append(entry)
    try JSONEncoder().encode(history).write(to: file, options: .atomic)
    try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
}

@discardableResult
func finishAndRecord(_ original: TaskSession, statePath: String, reason: String, now: Double) throws -> TaskSession {
    guard original.status != "finished" else { return original }
    try appendHistory(TaskHistoryEntry(session: original, reason: reason, now: now), statePath: statePath)
    var session = original
    session.end()
    try saveSession(session, to: statePath)
    return session
}

final class TaskMenuBar: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private let statePath: String
    private var statusItem: NSStatusItem?
    private var timer: Timer?
    private var lockDescriptor: Int32 = -1
    private var lastRenderedStart: Double?
    private var completing = false
    private var completionPanel: NSPanel?
    private var taskItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    private var remainingItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    private var stateItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    private var durationItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    private lazy var pauseItem = NSMenuItem(title: "Pause", action: #selector(togglePause), keyEquivalent: "")

    init(statePath: String) { self.statePath = statePath }

    func applicationDidFinishLaunching(_ notification: Notification) {
        lockDescriptor = Darwin.open(statePath + ".lock", O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard lockDescriptor >= 0 else { exit(1) }
        guard flock(lockDescriptor, LOCK_EX | LOCK_NB) == 0 else {
            do {
                let expected = try loadSession(statePath)
                for _ in 0..<40 {
                    if let ready = try? String(contentsOfFile: statePath + ".ready", encoding: .utf8),
                       ready == String(expected.startedAt) {
                        readySignal()
                        exit(0)
                    }
                    usleep(100_000)
                }
            } catch {}
            exit(1)
        }
        installMenuBar()
        readySignal()
    }

    private func installMenuBar() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem = item
        let menu = NSMenu()
        menu.delegate = self
        menu.addItem(taskItem)
        menu.addItem(remainingItem)
        menu.addItem(stateItem)
        menu.addItem(durationItem)
        menu.addItem(.separator())
        pauseItem.target = self
        menu.addItem(pauseItem)
        let endItem = NSMenuItem(title: "End Task", action: #selector(endTask), keyEquivalent: "")
        endItem.target = self
        menu.addItem(endItem)
        item.menu = menu
        update()
        let ticking = Timer(timeInterval: 1, repeats: true) { [weak self] _ in self?.update() }
        timer = ticking
        RunLoop.main.add(ticking, forMode: .common)
    }

    func menuWillOpen(_ menu: NSMenu) { update() }

    @objc private func togglePause() {
        do {
            var session = try loadSession(statePath)
            let now = nowMilliseconds()
            if session.status == "running" && session.remaining(at: now) == 0 {
                complete(session, notify: true)
                return
            }
            if session.status == "paused" { session.resume(at: now) } else { session.pause(at: now) }
            try saveSession(session, to: statePath)
            update()
        } catch { showError(error) }
    }

    @objc private func endTask() {
        do { complete(try loadSession(statePath), notify: false) }
        catch { showError(error) }
    }

    private func update() {
        guard !completing else { return }
        do {
            let session = try loadSession(statePath)
            if session.status == "finished" { close(); return }
            let seconds = session.remaining(at: nowMilliseconds())
            if session.status == "running" && seconds == 0 {
                complete(session, notify: true)
                return
            }
            let name = session.taskName.count > 20 ? String(session.taskName.prefix(19)) + "…" : session.taskName
            let paused = session.status == "paused"
            statusItem?.button?.title = "\(paused ? "⏸ " : "")\(name) \(timeLabel(seconds))"
            statusItem?.button?.font = NSFont.monospacedDigitSystemFont(ofSize: NSFont.systemFontSize, weight: .regular)
            statusItem?.button?.toolTip = "\(session.taskName) · \(paused ? "Paused" : "Running") · \(timeLabel(seconds)) remaining"
            taskItem.title = "Task: \(session.taskName)"
            remainingItem.title = "Remaining: \(timeLabel(seconds))"
            stateItem.title = "Status: \(paused ? "Paused" : "Running")"
            durationItem.title = "Duration: \(session.durationMinutes) min"
            pauseItem.title = paused ? "Resume" : "Pause"
            if lastRenderedStart != session.startedAt {
                try String(session.startedAt).write(toFile: statePath + ".ready", atomically: true, encoding: .utf8)
                lastRenderedStart = session.startedAt
            }
        } catch { close() }
    }

    private func complete(_ original: TaskSession, notify: Bool) {
        guard !completing else { return }
        let session: TaskSession
        do {
            session = try finishAndRecord(original, statePath: statePath,
                                          reason: notify ? "time-limit" : "manual", now: nowMilliseconds())
        }
        catch { showError(error); return }
        completing = true
        removeItem()
        guard notify else { NSApplication.shared.terminate(nil); return }
        DispatchQueue.main.async {
            if let sound = NSSound(named: "Glass") { sound.volume = 0.35; sound.play() }
            self.showCompletion(session)
        }
    }

    private func showCompletion(_ session: TaskSession) {
        let panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: CompletionCard.width, height: CompletionCard.height),
                            styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isReleasedWhenClosed = false
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.level = .floating
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.appearance = NSAppearance(named: .darkAqua)
        let container = NSView(frame: panel.contentView!.bounds)
        let glass = NSVisualEffectView(frame: container.bounds)
        glass.material = .hudWindow
        glass.blendingMode = .behindWindow
        glass.state = .active
        glass.wantsLayer = true
        glass.layer?.cornerRadius = 20
        glass.layer?.masksToBounds = true
        let work = TaskHistoryEntry(session: session, reason: "time-limit", now: session.endsAt).actualWorkMs
        let seconds = Int(work / 1000)
        let label = seconds % 60 == 0 ? "\(seconds / 60) min" : "\(seconds / 60) min \(seconds % 60) sec"
        let card = CompletionCard(taskName: session.taskName, workTime: label,
                                  dismiss: { [weak self] in self?.close() },
                                  extend: { [weak self] minutes in self?.extendTask(session, minutes: minutes) },
                                  menuChanged: { [weak self] open in self?.resizeCompletion(open: open) })
        let host = NSHostingView(rootView: card)
        host.frame = container.bounds
        host.autoresizingMask = [.width, .height]
        container.addSubview(glass)
        container.addSubview(host)
        panel.contentView = container
        if let screen = NSScreen.main ?? NSScreen.screens.first {
            let visible = screen.visibleFrame
            panel.setFrameOrigin(NSPoint(x: visible.maxX - CompletionCard.width - 18, y: visible.maxY - CompletionCard.height - 18))
        }
        completionPanel = panel
        // Nonactivating panel: never activate the app or block the user's work.
        panel.orderFrontRegardless()
    }

    private func resizeCompletion(open: Bool) {
        guard let panel = completionPanel else { return }
        let top = panel.frame.maxY
        let height = open ? CompletionCard.expandedHeight : CompletionCard.height
        panel.setFrame(NSRect(x: panel.frame.minX, y: top - height, width: CompletionCard.width, height: height), display: true)
        // Only the notification itself has a glass backing, not the transparent
        // gap beside the dropdown. Keep its top edge fixed when expanding.
        panel.contentView?.subviews.first?.frame = NSRect(x: 0, y: height - CompletionCard.height,
                                                         width: CompletionCard.width, height: CompletionCard.height)
    }

    private func extendTask(_ original: TaskSession, minutes: Int) {
        let descriptor = Darwin.open(statePath + ".lock", O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard descriptor >= 0 else { return }
        guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else { Darwin.close(descriptor); close(); return }
        do {
            let session = try extendedSession(original: original, current: loadSession(statePath),
                                              minutes: minutes, now: nowMilliseconds())
            try saveSession(session, to: statePath)
            lockDescriptor = descriptor
            completionPanel?.close()
            completionPanel = nil
            completing = false
            installMenuBar()
        } catch {
            Darwin.close(descriptor)
            close()
        }
    }

    private func showError(_ error: Error) {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Could not update timer"
            alert.informativeText = error.localizedDescription
            alert.runModal()
        }
    }

    private func removeItem() {
        timer?.invalidate()
        if let item = statusItem { NSStatusBar.system.removeStatusItem(item); statusItem = nil }
        if lockDescriptor >= 0 { Darwin.close(lockDescriptor); lockDescriptor = -1 }
    }

    private func close() { completionPanel?.close(); completionPanel = nil; removeItem(); NSApplication.shared.terminate(nil) }
    private func readySignal() { print("TASK_MENU_BAR_READY"); fflush(stdout) }

    func testCompletionUI() {
        let wasActive = NSApplication.shared.isActive
        showCompletion(TaskSession(taskName: "Review the proposal — 長いタスク名の表示確認", durationMinutes: 30,
                                   startedAt: 0, endsAt: 1_800_000, status: "finished"))
        guard let panel = completionPanel else { preconditionFailure("No completion panel") }
        precondition(panel.styleMask.contains(.nonactivatingPanel))
        precondition(!panel.isKeyWindow && !panel.isMainWindow)
        precondition(panel.frame.width == CompletionCard.width && panel.frame.height == CompletionCard.height)
        precondition(panel.contentView?.subviews.first is NSVisualEffectView)
        let top = panel.frame.maxY
        resizeCompletion(open: true)
        precondition(panel.frame.height == CompletionCard.expandedHeight && panel.frame.maxY == top)
        resizeCompletion(open: false)
        precondition(panel.frame.height == CompletionCard.height && panel.frame.maxY == top)
        precondition(NSApplication.shared.isActive == wasActive)
        if CommandLine.arguments.count == 3, let view = panel.contentView {
            view.layoutSubtreeIfNeeded()
            RunLoop.main.run(until: Date().addingTimeInterval(0.2))
            if let bitmap = view.bitmapImageRepForCachingDisplay(in: view.bounds) {
                view.cacheDisplay(in: view.bounds, to: bitmap)
                if let data = bitmap.representation(using: .png, properties: [:]) {
                    try! data.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
                }
            }
        }
        panel.close()
        completionPanel = nil
        print("Crimson Glass panel construction, sizing, and nonactivating behavior passed")
    }
}

if CommandLine.arguments.contains("--self-test") {
    var session = TaskSession(taskName: "テスト", durationMinutes: 15, startedAt: 0, endsAt: 900_000, status: "running")
    precondition(timeLabel(session.remaining(at: 1000)) == "14:59")
    session.pause(at: 300_000)
    precondition(session.status == "paused")
    precondition(session.remaining(at: 300_000) == 600)
    precondition(session.remaining(at: 1_000_000) == 600)
    precondition(TaskHistoryEntry(session: session, reason: "manual", now: 1_000_000).actualWorkMs == 300_000)
    session.resume(at: 1_000_000)
    precondition(session.status == "running" && session.endsAt == 1_600_000)
    precondition(session.remaining(at: 1_001_000) == 599)
    precondition(TaskHistoryEntry(session: session, reason: "manual", now: 1_001_000).actualWorkMs == 301_000)
    session.pause(at: 1_100_000)
    session.resume(at: 1_200_000)
    precondition(session.totalPausedMs == 800_000 && session.endsAt == 1_700_000)
    precondition(session.remaining(at: 1_700_000) == 0)
    precondition(TaskHistoryEntry(session: session, reason: "time-limit", now: 1_800_000).actualWorkMs == 900_000)
    session.end()
    precondition(session.status == "finished" && session.remaining(at: 0) == 0)
    let decoded = try JSONDecoder().decode(TaskSession.self, from: JSONEncoder().encode(session))
    precondition(decoded.endsAt == session.endsAt)
    for minutes in [5, 10, 15] {
        let extended = try extendedSession(original: session, current: session, minutes: minutes, now: 2_000_000)
        precondition(extended.taskName == session.taskName && extended.status == "running")
        precondition(extended.remaining(at: 2_000_000) == minutes * 60)
        precondition(extended.startedAt != session.startedAt && extended.totalPausedMs == nil)
        precondition(TaskHistoryEntry(session: extended, reason: "time-limit", now: extended.endsAt).actualWorkMs == Double(minutes) * 60_000)
        precondition(TaskHistoryEntry(session: extended, reason: "time-limit", now: extended.endsAt).id != TaskHistoryEntry(session: session, reason: "time-limit", now: session.endsAt).id)
    }
    var another = session
    another.status = "running"
    precondition((try? extendedSession(original: session, current: another, minutes: 5, now: 2_000_000)) == nil)
    another.end()
    another = TaskSession(taskName: "Another task", durationMinutes: 5, startedAt: 2_000_000, endsAt: 2_300_000, status: "finished")
    precondition((try? extendedSession(original: session, current: another, minutes: 5, now: 2_400_000)) == nil)
    precondition((try? extendedSession(original: session, current: session, minutes: 20, now: 2_000_000)) == nil)
    print("Countdown, pause/resume, repeated pause, manual end, expiry, and persistence checks passed")
    print("5/10/15-minute extensions, separate history segments, and stale notification protection passed")
    exit(0)
}

if CommandLine.arguments.count == 4 && CommandLine.arguments[1] == "--transition" {
    let statePath = CommandLine.arguments[2]
    var session = try loadSession(statePath)
    switch CommandLine.arguments[3] {
    case "pause": session.pause(at: nowMilliseconds())
    case "resume": session.resume(at: nowMilliseconds())
    case "end": session = try finishAndRecord(session, statePath: statePath, reason: "manual", now: nowMilliseconds())
    case "expire":
        guard session.status == "running", session.remaining(at: nowMilliseconds()) == 0 else { exit(1) }
        session = try finishAndRecord(session, statePath: statePath, reason: "time-limit", now: nowMilliseconds())
    case "extend-5", "extend-10", "extend-15":
        let minutes = Int(CommandLine.arguments[3].split(separator: "-").last!)!
        session = try extendedSession(original: session, current: session, minutes: minutes, now: nowMilliseconds())
    default: exit(1)
    }
    try saveSession(session, to: statePath)
    exit(0)
}

if CommandLine.arguments.contains("--ui-self-test") {
    let application = NSApplication.shared
    application.setActivationPolicy(.accessory)
    let controller = TaskMenuBar(statePath: "/private/tmp/task-ui-self-test-unused")
    withExtendedLifetime(controller) { controller.testCompletionUI() }
    exit(0)
}

guard CommandLine.arguments.count == 2 else { exit(1) }
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = TaskMenuBar(statePath: CommandLine.arguments[1])
app.delegate = delegate
app.run()
