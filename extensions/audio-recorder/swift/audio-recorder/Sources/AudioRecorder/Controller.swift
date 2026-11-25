import AVFoundation
import AppKit
import RecorderCore

struct Request: Codable {
  var action: String
  var mode: String?
  var format: String?
  var outputFolder: String?
  var microphoneSource: String?
}
struct Status: Codable {
  var state = "idle"
  var mode = "both"
  var format = "m4a"
  var duration: Double = 0
  var peak: Float = 0
  var maximumPeak: Float = 0
  var waveform: [Float] = []
  var microphonePeak: Float = 0
  var systemPeak: Float = 0
  var microphoneName: String?
  var warning: String?
  var microphoneBuffers: Int64 = 0
  var systemBuffers: Int64 = 0
  var lateFrames: Int64 = 0
  var rejectedFrames: Int64 = 0
  var file: String?
  var error: String?
  var commandError: String?
  var recoveryAvailable = false
  var pid = ProcessInfo.processInfo.processIdentifier
  var updatedAt = Date().timeIntervalSince1970
}
struct Journal: Codable {
  var source: String
  var destination: String
  var format: String
  var mode: String? = nil
}

final class Controller: NSObject, NSApplicationDelegate {
  let root: URL
  var status = Status()
  var session: CaptureSession?
  var journal: Journal?
  var timer: Timer?
  var menuItem: NSStatusItem!
  var lockFD: Int32 = -1
  var ownsLock = false
  var ticks = 0
  var monitorUntil = Date.distantPast
  var observers: [NSObjectProtocol] = []
  var signals: [DispatchSourceSignal] = []
  var quitAfterExport = false
  let fm = FileManager.default
  init(root: URL) {
    self.root = root
    super.init()
  }
  func applicationDidFinishLaunching(_ notification: Notification) {
    do {
      try fm.createDirectory(
        at: root.appendingPathComponent("requests"), withIntermediateDirectories: true,
        attributes: [.posixPermissions: 0o700])
      try fm.setAttributes([.posixPermissions: 0o700], ofItemAtPath: root.path)
      lockFD = open(root.appendingPathComponent("helper.lock").path, O_CREAT | O_RDWR, 0o600)
      guard lockFD >= 0, flock(lockFD, LOCK_EX | LOCK_NB) == 0 else {
        NSApp.terminate(nil)
        return
      }
      ownsLock = true
      if let data = try? Data(contentsOf: root.appendingPathComponent("session.json")) {
        journal = try JSONDecoder().decode(Journal.self, from: data)
      }
      status.recoveryAvailable = journal != nil
      menuItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
      for name in [
        NSWorkspace.willSleepNotification, NSWorkspace.sessionDidResignActiveNotification,
      ] {
        observers.append(
          NSWorkspace.shared.notificationCenter.addObserver(
            forName: name, object: nil, queue: .main
          ) { [weak self] _ in
            if let self, self.session != nil {
              self.finish(
                reason:
                  "Recording stopped because the Mac went to sleep or the user session changed.")
            }
          })
      }
      for value in [SIGTERM, SIGINT] {
        signal(value, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: value, queue: .main)
        source.setEventHandler { [weak self] in
          guard let self else { return }
          if self.session != nil {
            self.quitAfterExport = true
            self.finish()
          } else if self.status.state == "finalizing" {
            self.quitAfterExport = true
          } else {
            NSApp.terminate(nil)
          }
        }
        source.resume()
        signals.append(source)
      }
      refresh()
      timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
        self?.poll()
      }
    } catch {
      fputs("\(error.localizedDescription)\n", stderr)
      NSApp.terminate(nil)
    }
  }
  func write<T: Encodable>(_ value: T, to url: URL) throws {
    let data = try JSONEncoder().encode(value)
    try data.write(to: url, options: .atomic)
    try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
  }
  func poll() {
    let directory = root.appendingPathComponent("requests")
    for url in ((try? fm.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? [])
      .filter({ $0.pathExtension == "json" }).sorted(by: {
        $0.lastPathComponent < $1.lastPathComponent
      })
    {
      do {
        let request = try JSONDecoder().decode(Request.self, from: Data(contentsOf: url))
        try handle(request)
        refresh()
        try write(status, to: url.deletingPathExtension().appendingPathExtension("reply"))
      } catch {
        var response = status
        response.commandError = error.localizedDescription
        try? write(response, to: url.deletingPathExtension().appendingPathExtension("reply"))
      }
      try? fm.removeItem(at: url)
    }
    ticks += 1
    if session != nil && Date() < monitorUntil {
      refresh(updateMenu: ticks % 5 == 0)
    } else if ticks % (session == nil && status.state != "finalizing" ? 25 : 5) == 0 {
      refresh()
    }
    if ticks % 5 == 0 { checkDisk() }
    // Remove abandoned reply files after 10 minutes, never active requests.
    if ticks % 300 == 0 {
      for file
        in (try? fm.contentsOfDirectory(
          at: directory, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
      where file.pathExtension == "reply" {
        if let date = try? file.resourceValues(forKeys: [.contentModificationDateKey])
          .contentModificationDate, Date().timeIntervalSince(date) > 600
        {
          try? fm.removeItem(at: file)
        }
      }
    }
  }
  func handle(_ request: Request) throws {
    switch request.action {
    case "status": break
    case "monitor": monitorUntil = Date().addingTimeInterval(8)
    case "start": try begin(request)
    case "pause":
      guard let session, status.state == "recording" else {
        throw RecorderError.message("No recording is running.")
      }
      try session.setPaused(true)
      status.state = "paused"
    case "resume":
      guard let session, status.state == "paused" else {
        throw RecorderError.message("No recording is paused.")
      }
      try session.setPaused(false)
      status.state = "recording"
    case "stop":
      guard session != nil else { throw RecorderError.message("No active recording.") }
      finish()
    case "recover":
      guard session == nil, status.state != "finalizing", status.state != "starting", let journal
      else { throw RecorderError.message("No interrupted recording to recover.") }
      var recovered = journal
      if fm.fileExists(atPath: recovered.destination) {
        let old = URL(fileURLWithPath: recovered.destination)
        recovered.destination =
          old.deletingPathExtension().appendingPathExtension(
            "recovered-\(UUID().uuidString.prefix(6)).\(journal.format)"
          ).path
        try write(recovered, to: root.appendingPathComponent("session.json"))
        self.journal = recovered
      }
      status.error = nil
      export(recovered)
    case "quit":
      guard session == nil, status.state != "starting", status.state != "finalizing" else {
        throw RecorderError.message("Stop recording before quitting the helper.")
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { NSApp.terminate(nil) }
    default: throw RecorderError.message("Unknown recording action.")
    }
  }
  func begin(_ request: Request) throws {
    guard session == nil, !["starting", "finalizing"].contains(status.state) else {
      throw RecorderError.message("A recording is already active or saving.")
    }
    guard journal == nil else {
      throw RecorderError.message("Recover the interrupted recording before starting another.")
    }
    let mode = request.mode ?? "both"
    let format = request.format ?? "m4a"
    guard ["both", "system", "microphone"].contains(mode), ["m4a", "wav"].contains(format) else {
      throw RecorderError.message("Invalid recording mode or format.")
    }
    let folderPath = NSString(string: request.outputFolder ?? "~/Documents/Recordings")
      .expandingTildeInPath
    guard folderPath.hasPrefix("/") else {
      throw RecorderError.message("Choose an absolute output folder.")
    }
    let folder = URL(fileURLWithPath: folderPath, isDirectory: true)
    try fm.createDirectory(at: folder, withIntermediateDirectories: true)
    try requireDisk(folder)
    let date = DateFormatter()
    date.dateFormat = "yyyy-MM-dd_HH-mm-ss"
    date.locale = Locale(identifier: "en_US_POSIX")
    let name = "Recording_\(date.string(from: Date()))_\(UUID().uuidString.prefix(6))"
    let destination = folder.appendingPathComponent(name).appendingPathExtension(format)
    // Stage beside the output so Documents permission / external volume failures happen up front.
    let source = folder.appendingPathComponent(".\(name).capture.caf")
    status = Status()
    status.state = "starting"
    status.mode = mode
    status.format = format
    status.file = destination.path
    refresh()
    Task { @MainActor [self] in
      if mode != "system" {
        let authorization = AVCaptureDevice.authorizationStatus(for: .audio)
        var allowed = authorization == .authorized
        if authorization == .notDetermined {
          allowed = await AVCaptureDevice.requestAccess(for: .audio)
        }
        guard allowed else {
          self.status.state = "error"
          self.status.error =
            "Microphone access is denied. Enable Audio Recorder in System Settings → Privacy & Security → Microphone."
          self.refresh()
          return
        }
      }
      do {
        let journal = Journal(
          source: source.path, destination: destination.path, format: format, mode: mode)
        try self.write(journal, to: self.root.appendingPathComponent("session.json"))
        self.journal = journal
        let capture = CaptureSession(
          mode: mode, microphoneSource: request.microphoneSource ?? "default")
        capture.onFailure = { [weak self] message in self?.finish(reason: message) }
        try capture.start(at: source)
        self.session = capture
        self.status.state = "recording"
        self.refresh()
      } catch {
        self.status.state = "error"
        self.status.error = error.localizedDescription
        if ((try? AVAudioFile(forReading: source).length) ?? 0) == 0 {
          try? self.fm.removeItem(at: source)
          try? self.fm.removeItem(at: self.root.appendingPathComponent("session.json"))
          self.journal = nil
        }
        self.refresh()
      }
    }
  }
  func finish(reason: String? = nil) {
    guard let session, let journal else { return }
    let metrics = session.stop()
    status.duration = Double(metrics.frames) / 48_000
    status.microphoneBuffers = metrics.microphoneBuffers
    status.systemBuffers = metrics.systemBuffers
    status.lateFrames = metrics.lateFrames
    status.rejectedFrames = metrics.rejectedFrames
    self.session = nil
    status.maximumPeak = metrics.maximumPeak
    status.error = reason
    if metrics.frames > 0 && metrics.maximumPeak == 0 {
      status.warning =
        "This recording contains silence. Check your selected microphone, microphone mute and System Audio Recording permission before recording again."
    }
    export(journal)
  }
  func export(_ journal: Journal) {
    status.state = "finalizing"
    status.format = journal.format
    status.mode = journal.mode ?? status.mode
    refresh()
    DispatchQueue.global(qos: .utility).async {
      do {
        let urls = try AudioFiles.export(
          source: URL(fileURLWithPath: journal.source),
          destination: URL(fileURLWithPath: journal.destination), format: journal.format)
        let exportedDuration = try urls.reduce(0.0) { duration, url in
          let file = try AVAudioFile(forReading: url)
          return duration + Double(file.length) / file.processingFormat.sampleRate
        }
        DispatchQueue.main.async {
          self.status.duration = exportedDuration
          self.status.file = urls.first?.path
          try? self.fm.removeItem(atPath: journal.source)
          try? self.fm.removeItem(at: self.root.appendingPathComponent("session.json"))
          self.journal = nil
          self.status.state = self.status.error == nil ? "idle" : "error"
          self.refresh()
          if self.quitAfterExport { NSApp.terminate(nil) }
        }
      } catch {
        DispatchQueue.main.async {
          self.status.state = "error"
          self.status.error =
            "Save failed: \(error.localizedDescription) Original capture retained; use Recover Recording."
          self.refresh()
          if self.quitAfterExport { NSApp.terminate(nil) }
        }
      }
    }
  }
  func requireDisk(_ folder: URL) throws {
    let attributes = try fm.attributesOfFileSystem(forPath: folder.path)
    guard (attributes[.systemFreeSize] as? NSNumber)?.int64Value ?? 0 > 512 * 1024 * 1024 else {
      throw RecorderError.message("Less than 512 MB free. Free disk space before recording.")
    }
  }
  func checkDisk() {
    guard session != nil, let journal else { return }
    do { try requireDisk(URL(fileURLWithPath: journal.source).deletingLastPathComponent()) } catch {
      finish(reason: error.localizedDescription)
    }
  }
  func refresh(updateMenu: Bool = true) {
    if let metrics = session?.snapshot() {
      status.duration = Double(metrics.frames) / 48_000
      status.peak = metrics.peak
      status.maximumPeak = metrics.maximumPeak
      status.waveform = metrics.waveform
      status.microphonePeak = metrics.microphonePeak
      status.systemPeak = metrics.systemPeak
      status.microphoneName = session?.microphoneName
      status.warning =
        metrics.frames >= 240_000 && metrics.maximumPeak == 0
        ? "No audio signal detected. Speak or play audio to check capture; verify your microphone, mute setting and audio permissions."
        : nil
      status.microphoneBuffers = metrics.microphoneBuffers
      status.systemBuffers = metrics.systemBuffers
      status.lateFrames = metrics.lateFrames
      status.rejectedFrames = metrics.rejectedFrames
    }
    status.recoveryAvailable =
      journal != nil && session == nil && status.state != "finalizing" && status.state != "starting"
    status.updatedAt = Date().timeIntervalSince1970
    try? write(status, to: root.appendingPathComponent("status.json"))
    guard updateMenu else { return }
    let active = session != nil
    let duration = String(
      format: "%02d:%02d:%02d", Int(status.duration) / 3600, Int(status.duration) / 60 % 60,
      Int(status.duration) % 60)
    if let button = menuItem?.button {
      let symbol = NSImage(
        systemSymbolName: active
          ? (status.state == "paused" ? "pause.circle.fill" : "record.circle.fill") : "waveform",
        accessibilityDescription: "Audio Recorder: \(status.state)")
      symbol?.isTemplate = !active
      if active, let symbol {
        let image = NSImage(size: symbol.size)
        image.lockFocus()
        NSColor.systemRed.set()
        NSRect(origin: .zero, size: symbol.size).fill()
        symbol.draw(at: .zero, from: .zero, operation: .destinationIn, fraction: 1)
        image.unlockFocus()
        button.image = image
      } else {
        button.image = symbol
      }
      button.title = active ? " \(duration)" : (status.state == "finalizing" ? " Saving…" : "")
      button.toolTip = status.error ?? "Audio Recorder · \(status.state)"
      button.font = .monospacedDigitSystemFont(ofSize: 12, weight: .regular)
    }
    let menu = NSMenu()
    menu.addItem(
      withTitle: active
        ? "\(status.state.capitalized) · \(duration)"
        : "Audio Recorder · \(status.state.capitalized)", action: nil, keyEquivalent: "")
    if active {
      menu.addItem(
        item(
          status.state == "paused" ? "Resume Recording" : "Pause Recording", #selector(togglePause))
      )
      menu.addItem(item("Stop and Save Recording", #selector(stopAction)))
    }
    if active {
      if let name = status.microphoneName, status.mode != "system" {
        menu.addItem(withTitle: "Microphone: \(name)", action: nil, keyEquivalent: "")
      }
      menu.addItem(
        withTitle:
          "Mic signal: \(status.microphonePeak > 0 ? "Detected" : "Silent") · System: \(status.systemPeak > 0 ? "Detected" : "Silent")",
        action: nil, keyEquivalent: "")
    }
    if let warning = status.warning {
      menu.addItem(withTitle: warning, action: nil, keyEquivalent: "")
    }
    if status.recoveryAvailable {
      menu.addItem(item("Recover Interrupted Recording", #selector(recoverAction)))
    }
    if let error = status.error { menu.addItem(withTitle: error, action: nil, keyEquivalent: "") }
    menu.addItem(.separator())
    menu.addItem(item("Show Recordings in Finder", #selector(reveal)))
    let quit = item("Quit Audio Recorder", #selector(quit))
    quit.isEnabled = !active && !["starting", "finalizing"].contains(status.state)
    menu.addItem(quit)
    menuItem?.menu = menu
  }
  func item(_ title: String, _ action: Selector) -> NSMenuItem {
    let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
    item.target = self
    return item
  }
  @objc func togglePause() {
    do {
      try handle(Request(action: status.state == "paused" ? "resume" : "pause"))
      refresh()
    } catch {
      status.error = error.localizedDescription
      refresh()
    }
  }
  @objc func stopAction() { finish() }
  @objc func recoverAction() {
    do { try handle(Request(action: "recover")) } catch {
      status.error = error.localizedDescription
      refresh()
    }
  }
  @objc func reveal() {
    if let file = status.file {
      NSWorkspace.shared.selectFile(file, inFileViewerRootedAtPath: "")
    } else {
      NSWorkspace.shared.open(
        URL(fileURLWithPath: NSString(string: "~/Documents/Recordings").expandingTildeInPath))
    }
  }
  @objc func quit() { NSApp.terminate(nil) }
  func applicationWillTerminate(_ notification: Notification) {
    // A rejected duplicate must never touch the winning worker's status. Remove
    // our status while still holding the lock so a new owner cannot race cleanup.
    if ownsLock {
      try? fm.removeItem(at: root.appendingPathComponent("status.json"))
      ownsLock = false
    }
    if lockFD >= 0 { close(lockFD); lockFD = -1 }
  }
}
