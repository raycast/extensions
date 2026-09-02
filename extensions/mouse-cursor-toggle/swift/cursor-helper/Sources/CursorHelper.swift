import CoreGraphics
import Darwin
import Foundation
import RaycastSwiftMacros

@_silgen_name("_CGSDefaultConnection")
private func cgsDefaultConnection() -> UInt32

@_silgen_name("CGSSetConnectionProperty")
private func cgsSetConnectionProperty(
  _ connection: UInt32,
  _ target: UInt32,
  _ key: CFString,
  _ value: CFTypeRef
) -> CGError

private struct CursorHelperError: LocalizedError, CustomStringConvertible {
  let message: String

  var errorDescription: String? { message }
  var description: String { message }
}

private struct HelperPaths {
  let state: String
  let control: String
  let error: String
  let lock: String

  init(supportPath: String) {
    state =
      URL(fileURLWithPath: supportPath)
      .appendingPathComponent("cursor-helper.state")
      .path
    control = "\(state).control"
    error = "\(state).error"
    lock = "\(state).lock"
  }

  init(statePath: String) {
    state = statePath
    control = "\(statePath).control"
    error = "\(statePath).error"
    lock = "\(statePath).lock"
  }
}

private struct HelperState {
  let token: String
  let pid: pid_t
  let isReady: Bool
}

@raycast func toggleCursor(supportPath: String) throws -> String {
  let paths = HelperPaths(supportPath: supportPath)
  try FileManager.default.createDirectory(
    atPath: supportPath,
    withIntermediateDirectories: true
  )

  if let helper = try getRunningHelper(paths: paths) {
    try showCursor(helper: helper, paths: paths)
    return "shown"
  }

  try hideCursor(paths: paths)
  return "hidden"
}

@raycast func runCursorHelper(statePath: String, token: String) {
  CursorWorker(paths: HelperPaths(statePath: statePath), token: token).run()
}

private func getRunningHelper(paths: HelperPaths) throws -> HelperState? {
  let rawState: String

  do {
    rawState = try String(contentsOfFile: paths.state, encoding: .utf8)
  } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
    return nil
  }

  let parts = rawState.split(whereSeparator: \.isWhitespace)
  guard
    parts.count >= 2,
    !parts[0].isEmpty,
    let pid = pid_t(parts[1]),
    pid > 1
  else {
    try removeStaleState(paths: paths)
    return nil
  }

  guard try writeToControlChannel(paths: paths) else {
    try removeStaleState(paths: paths)
    return nil
  }

  return HelperState(
    token: String(parts[0]),
    pid: pid,
    isReady: parts.count < 3 || parts[2] == "hidden"
  )
}

private func showCursor(helper: HelperState, paths: HelperPaths) throws {
  let stopRequested =
    (try? writeToControlChannel(
      message: "STOP \(helper.token)\n",
      paths: paths
    )) ?? false

  if stopRequested, try waitForHelperToStop(paths: paths) {
    return
  }

  if kill(helper.pid, SIGTERM) != 0, errno != ESRCH {
    throw posixError("Could not stop the cursor helper.")
  }

  if try waitForHelperToStop(paths: paths) {
    return
  }

  throw CursorHelperError(message: "The cursor helper did not stop in time.")
}

private func hideCursor(paths: HelperPaths) throws {
  try removeItemIfPresent(atPath: paths.error)

  let token = UUID().uuidString
  let pid = try spawnDetachedHelper(statePath: paths.state, token: token)
  let started = try waitFor {
    guard let helper = try getRunningHelper(paths: paths) else {
      return false
    }
    return helper.token == token && helper.isReady
  }

  guard started else {
    var status: Int32 = 0
    if waitpid(pid, &status, WNOHANG) == 0 {
      kill(pid, SIGTERM)
    }

    let nativeError = try? String(contentsOfFile: paths.error, encoding: .utf8)
      .trimmingCharacters(in: .whitespacesAndNewlines)
    if let nativeError, !nativeError.isEmpty {
      throw CursorHelperError(message: nativeError)
    }
    throw CursorHelperError(message: "The cursor helper could not start.")
  }
}

private func waitForHelperToStop(paths: HelperPaths) throws -> Bool {
  try waitFor {
    let helperStopped = try getRunningHelper(paths: paths) == nil
    return helperStopped && isLockAvailable(path: paths.lock)
  }
}

private func waitFor(
  timeout: TimeInterval = 2,
  predicate: () throws -> Bool
) throws -> Bool {
  let deadline = Date().addingTimeInterval(timeout)

  while Date() < deadline {
    if try predicate() {
      return true
    }
    usleep(50_000)
  }

  return try predicate()
}

private func writeToControlChannel(
  message: String? = nil,
  paths: HelperPaths
) throws -> Bool {
  let descriptor = open(paths.control, O_WRONLY | O_NONBLOCK)
  guard descriptor >= 0 else {
    if errno == ENOENT || errno == ENXIO {
      return false
    }
    throw posixError("Could not open the cursor helper control pipe.")
  }
  defer { close(descriptor) }

  guard let message else {
    return true
  }

  let data = Data(message.utf8)
  try data.withUnsafeBytes { bytes in
    var offset = 0
    while offset < bytes.count {
      let count = Darwin.write(
        descriptor,
        bytes.baseAddress!.advanced(by: offset),
        bytes.count - offset
      )
      if count < 0 {
        if errno == EINTR {
          continue
        }
        throw posixError("Could not write to the cursor helper control pipe.")
      }
      offset += count
    }
  }

  return true
}

private func isLockAvailable(path: String) -> Bool {
  let descriptor = open(path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
  guard descriptor >= 0 else {
    return false
  }
  defer { close(descriptor) }

  guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else {
    return false
  }

  flock(descriptor, LOCK_UN)
  return true
}

private func removeStaleState(paths: HelperPaths) throws {
  try removeItemIfPresent(atPath: paths.state)
  try removeItemIfPresent(atPath: paths.control)
  try removeItemIfPresent(atPath: paths.error)
}

private func removeItemIfPresent(atPath path: String) throws {
  do {
    try FileManager.default.removeItem(atPath: path)
  } catch let error as CocoaError where error.code == .fileNoSuchFile {
    return
  }
}

private func spawnDetachedHelper(statePath: String, token: String) throws -> pid_t {
  guard let executablePath = Bundle.main.executablePath else {
    throw CursorHelperError(message: "Could not locate the cursor helper executable.")
  }
  let stateArgument = try encodeArgument(statePath)
  let tokenArgument = try encodeArgument(token)
  let arguments = [executablePath, "runCursorHelper", stateArgument, tokenArgument]
  var argv = arguments.map { strdup($0) }
  argv.append(nil)
  defer {
    for argument in argv where argument != nil {
      free(argument)
    }
  }

  var attributes: posix_spawnattr_t?
  var fileActions: posix_spawn_file_actions_t?

  guard posix_spawnattr_init(&attributes) == 0 else {
    throw CursorHelperError(message: "Could not initialize the cursor helper process.")
  }
  defer { posix_spawnattr_destroy(&attributes) }

  guard posix_spawn_file_actions_init(&fileActions) == 0 else {
    throw CursorHelperError(message: "Could not initialize the cursor helper process.")
  }
  defer { posix_spawn_file_actions_destroy(&fileActions) }

  let flags = Int16(POSIX_SPAWN_SETSID)
  guard posix_spawnattr_setflags(&attributes, flags) == 0 else {
    throw CursorHelperError(message: "Could not detach the cursor helper process.")
  }

  guard
    posix_spawn_file_actions_addopen(
      &fileActions,
      STDIN_FILENO,
      "/dev/null",
      O_RDONLY,
      0
    ) == 0,
    posix_spawn_file_actions_addopen(
      &fileActions,
      STDOUT_FILENO,
      "/dev/null",
      O_WRONLY,
      0
    ) == 0,
    posix_spawn_file_actions_addopen(
      &fileActions,
      STDERR_FILENO,
      "/dev/null",
      O_WRONLY,
      0
    ) == 0
  else {
    throw CursorHelperError(message: "Could not configure the cursor helper process.")
  }

  var pid: pid_t = 0
  let spawnResult = argv.withUnsafeMutableBufferPointer { buffer in
    posix_spawn(
      &pid,
      executablePath,
      &fileActions,
      &attributes,
      buffer.baseAddress,
      environ
    )
  }

  guard spawnResult == 0 else {
    throw posixError("Could not start the cursor helper.", code: spawnResult)
  }

  return pid
}

private func encodeArgument(_ value: String) throws -> String {
  let data = try JSONEncoder().encode(value)
  guard let encoded = String(data: data, encoding: .utf8) else {
    throw CursorHelperError(message: "Could not encode the cursor helper arguments.")
  }
  return encoded
}

private func posixError(_ message: String, code: Int32 = errno) -> CursorHelperError {
  CursorHelperError(message: "\(message) \(String(cString: strerror(code)))")
}

private final class CursorWorker {
  private let paths: HelperPaths
  private let token: String
  private var lockDescriptor: Int32 = -1
  private var controlDescriptor: Int32 = -1
  private var ownsLock = false
  private var isHideInFlight = false
  private var isCursorHidden = false
  private var pendingExitStatus: Int32?
  private var terminationSource: DispatchSourceSignal?
  private var interruptSource: DispatchSourceSignal?

  init(paths: HelperPaths, token: String) {
    self.paths = paths
    self.token = token
  }

  func run() -> Never {
    lockDescriptor = open(paths.lock, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard lockDescriptor >= 0 else {
      failAndExit("Could not open the cursor helper lock file.")
    }

    guard flock(lockDescriptor, LOCK_EX | LOCK_NB) == 0 else {
      close(lockDescriptor)
      lockDescriptor = -1
      failAndExit("Another cursor helper is already running.")
    }
    ownsLock = true

    configureSignalHandling()

    unlink(paths.state)
    unlink(paths.control)
    unlink(paths.error)
    guard mkfifo(paths.control, S_IRUSR | S_IWUSR) == 0 else {
      failAndExit("Could not create the cursor helper control pipe.")
    }

    controlDescriptor = open(paths.control, O_RDWR)
    guard controlDescriptor >= 0 else {
      failAndExit("Could not open the cursor helper control pipe.")
    }

    listenForStopRequest()

    do {
      try writeState(phase: "starting")
    } catch {
      failAndExit("Could not write the cursor helper state.")
    }

    hideCursor()
    dispatchMain()
  }

  private func hideCursor() {
    isHideInFlight = true

    DispatchQueue.global(qos: .userInitiated).async { [self] in
      let connection = cgsDefaultConnection()
      let backgroundCursorResult = cgsSetConnectionProperty(
        connection,
        connection,
        "SetsCursorInBackground" as CFString,
        kCFBooleanTrue
      )
      let hideCursorResult =
        backgroundCursorResult == .success
        ? CGDisplayHideCursor(CGMainDisplayID())
        : .failure

      DispatchQueue.main.async { [self] in
        isHideInFlight = false

        if backgroundCursorResult == .success, hideCursorResult == .success {
          isCursorHidden = true
        }

        if let pendingExitStatus {
          cleanUpAndExit(pendingExitStatus)
        }

        guard backgroundCursorResult == .success else {
          failAndExit("WindowServer refused background cursor control.")
        }
        guard hideCursorResult == .success else {
          failAndExit("Core Graphics refused to hide the cursor.")
        }

        do {
          try writeState(phase: "hidden")
        } catch {
          failAndExit("Could not write the cursor helper state.")
        }
      }
    }
  }

  private func writeState(phase: String) throws {
    try "\(token)\n\(getpid())\n\(phase)\n".write(
      toFile: paths.state,
      atomically: true,
      encoding: .utf8
    )
    chmod(paths.state, S_IRUSR | S_IWUSR)
  }

  private func configureSignalHandling() {
    signal(SIGTERM, SIG_IGN)
    signal(SIGINT, SIG_IGN)

    terminationSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
    interruptSource = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)

    terminationSource?.setEventHandler { [self] in
      requestExit(EXIT_SUCCESS)
    }
    interruptSource?.setEventHandler { [self] in
      requestExit(EXIT_SUCCESS)
    }

    terminationSource?.resume()
    interruptSource?.resume()
  }

  private func listenForStopRequest() {
    DispatchQueue.global(qos: .utility).async { [self] in
      while true {
        var buffer = [UInt8](repeating: 0, count: 512)
        let byteCount = read(controlDescriptor, &buffer, buffer.count)

        if byteCount > 0 {
          let messages = String(decoding: buffer.prefix(byteCount), as: UTF8.self)
            .split(whereSeparator: \.isNewline)

          if messages.contains(where: { $0 == "STOP \(token)" }) {
            DispatchQueue.main.async { [self] in
              requestExit(EXIT_SUCCESS)
            }
            return
          }
        } else if byteCount < 0, errno != EINTR {
          return
        }
      }
    }
  }

  private func failAndExit(_ message: String) -> Never {
    try? "\(message)\n".write(
      toFile: paths.error,
      atomically: true,
      encoding: .utf8
    )
    cleanUpAndExit(EXIT_FAILURE)
  }

  private func requestExit(_ status: Int32) {
    if isHideInFlight {
      if pendingExitStatus == nil {
        pendingExitStatus = status
      }
      return
    }

    cleanUpAndExit(status)
  }

  private func cleanUpAndExit(_ status: Int32) -> Never {
    if ownsLock, isCursorHidden {
      CGDisplayShowCursor(CGMainDisplayID())
      isCursorHidden = false
    }

    if ownsLock {
      unlink(paths.control)
      unlink(paths.state)
    }

    if ownsLock, lockDescriptor >= 0 {
      flock(lockDescriptor, LOCK_UN)
      close(lockDescriptor)
      lockDescriptor = -1
      ownsLock = false
    }

    _exit(status)
  }
}
