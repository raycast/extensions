import AppKit
import RaycastSwiftMacros

// Functions exported to TypeScript. Raycast runs one process per call, passes
// each argument as JSON and reads the JSON result from stdout.

struct PickResult: Codable {
  let kind: String
  /// Global top-left points, "x,y,w,h".
  let rect: String
  let id: Int?
}

struct RecordingRequest: Codable {
  let rect: String
  let windowId: Int?
  let output: String
  let countdown: Int
  let maxSeconds: Int
  let showClicks: Bool
  let showCursor: Bool
  let doneURL: String
}

enum HelperError: Error {
  case badRect(String)
  case spawnFailed(Int32)
}

/// Runs an AppKit session on the main thread until `body` calls `stop`.
private func runApp(_ body: (_ stop: @escaping () -> Void) -> Void) {
  MainActor.assumeIsolated {
    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)
    body {
      app.stop(nil)
      // stop() only takes effect after the next event, so post one.
      let wake = NSEvent.otherEvent(
        with: .applicationDefined, location: .zero, modifierFlags: [], timestamp: 0, windowNumber: 0,
        context: nil, subtype: 0, data1: 0, data2: 0)
      if let wake { app.postEvent(wake, atStart: true) }
    }
    app.run()
  }
}

/// Shows the picker overlay. Returns nil when the user presses Escape.
@raycast func pickTarget(mode: String) -> PickResult? {
  var result: PickResult?
  var picker: Picker?
  runApp { stop in
    picker = Picker(mode: mode == "window" ? .window : .region) { picked in
      result = picked
      stop()
    }
    picker?.show()
    NSApplication.shared.activate(ignoringOtherApps: true)
  }
  _ = picker

  return result
}

/// The display under the mouse, as "x,y,w,h" in global top-left points.
@raycast func screenUnderMouse() -> String {
  MainActor.assumeIsolated {
    Geometry.format(Geometry.toTopLeft(Geometry.screenUnderMouse().frame))
  }
}

/// Starts the recorder in its own process so it outlives this call. Returns its pid.
@raycast func startRecording(request: RecordingRequest) throws -> Int32 {
  guard Geometry.parse(request.rect) != nil else { throw HelperError.badRect(request.rect) }

  let json = String(decoding: try JSONEncoder().encode(request), as: UTF8.self)
  let executable = Bundle.main.executablePath ?? CommandLine.arguments[0]

  return try spawnDetached(executable, arguments: ["runRecorder", json])
}

/// The recorder process itself (see startRecording). Exits when the recording ends.
@raycast func runRecorder(request: RecordingRequest) {
  var config = RecorderConfig(rect: Geometry.parse(request.rect) ?? .zero, output: request.output)
  config.windowId = request.windowId
  config.countdown = request.countdown
  config.maxSeconds = request.maxSeconds
  config.showClicks = request.showClicks
  config.showCursor = request.showCursor
  config.doneURL = URL(string: request.doneURL)

  var recorder: Recorder?
  runApp { _ in
    recorder = Recorder(config: config)
    recorder?.run()
  }
  _ = recorder
}

/// posix_spawn in a new session, so the recorder survives Raycast cleaning up this call.
private func spawnDetached(_ executable: String, arguments: [String]) throws -> Int32 {
  var attributes: posix_spawnattr_t?
  posix_spawnattr_init(&attributes)
  defer { posix_spawnattr_destroy(&attributes) }
  posix_spawnattr_setflags(&attributes, Int16(POSIX_SPAWN_SETSID))

  var actions: posix_spawn_file_actions_t?
  posix_spawn_file_actions_init(&actions)
  defer { posix_spawn_file_actions_destroy(&actions) }
  posix_spawn_file_actions_addopen(&actions, 0, "/dev/null", O_RDONLY, 0)
  posix_spawn_file_actions_addopen(&actions, 1, "/dev/null", O_WRONLY, 0)
  posix_spawn_file_actions_addopen(&actions, 2, "/dev/null", O_WRONLY, 0)

  let argv = ([executable] + arguments).map { strdup($0) } + [nil]
  defer { argv.forEach { free($0) } }

  var pid: pid_t = 0
  let status = posix_spawn(&pid, executable, &actions, &attributes, argv, environ)
  guard status == 0 else { throw HelperError.spawnFailed(status) }

  return pid
}
