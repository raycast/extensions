import Darwin
import Foundation

/// One scanner at a time. The holder keeps an flock on a file in the caches folder.
/// The kernel drops the lock when the process dies, so a killed scanner leaves no stale state.
struct ScannerLock {
  enum Mode: String { case toggle, once }

  private let fd: Int32

  private static var path: String {
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
      ?? URL(fileURLWithPath: NSTemporaryDirectory())
    let folder = caches.appendingPathComponent("com.daanmlab.camera-barcode-scanner")
    try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    return folder.appendingPathComponent("scanner.lock").path
  }

  /// Takes the lock for this process. Returns nil when another scanner holds it.
  static func acquire(mode: Mode) throws -> ScannerLock? {
    let fd = open(path, O_RDWR | O_CREAT | O_CLOEXEC, 0o600)
    guard fd >= 0 else { throw ScannerError("Could not create the scanner lock file.") }
    guard flock(fd, LOCK_EX | LOCK_NB) == 0 else {
      close(fd)
      return nil
    }
    let record = "\(getpid()) \(mode.rawValue)"
    ftruncate(fd, 0)
    _ = record.withCString { pwrite(fd, $0, strlen($0), 0) }
    return ScannerLock(fd: fd)
  }

  func release() {
    ftruncate(fd, 0)
    flock(fd, LOCK_UN)
    close(fd)
  }

  /// The scanner that holds the lock, or nil when no scanner runs. The pid is nil while the
  /// holder has not written it yet.
  static func holder() -> (pid: Int?, mode: Mode?)? {
    let fd = open(path, O_RDONLY | O_CLOEXEC)
    guard fd >= 0 else { return nil }
    defer { close(fd) }
    if flock(fd, LOCK_SH | LOCK_NB) == 0 {
      flock(fd, LOCK_UN)
      return nil
    }
    var buffer = [CChar](repeating: 0, count: 64)
    let count = pread(fd, &buffer, buffer.count - 1, 0)
    let parts = count > 0 ? String(cString: buffer).split(separator: " ") : []
    let pid = parts.first.flatMap { Int($0) }
    let mode = parts.count > 1 ? Mode(rawValue: String(parts[1])) : nil
    return (pid, mode)
  }

  /// The plain error for a scanner that is already open.
  static func busyError(_ mode: Mode?) -> ScannerError {
    switch mode {
    case .once: return ScannerError("Scan Barcode Once is already open. Finish that scan first.")
    default: return ScannerError("The barcode scanner is already on. Run Toggle Barcode Scanner to turn it off.")
    }
  }
}

enum ScannerProcess {
  static let entryPoint = "runScanner"
  private static let readyFd: Int32 = 3
  private static let readyTimeout: Int32 = 3000

  /// True when the pid runs this executable as a detached scanner. Never true for another program,
  /// so a reused pid is never signalled.
  static func isScanner(pid: Int) -> Bool {
    guard pid > 1, pid_t(pid) != getpid(), kill(pid_t(pid), 0) == 0 else { return false }
    var buffer = [CChar](repeating: 0, count: 4096)
    guard proc_pidpath(pid_t(pid), &buffer, UInt32(buffer.count)) > 0 else { return false }
    let name = URL(fileURLWithPath: String(cString: buffer)).lastPathComponent
    guard name == URL(fileURLWithPath: executablePath()).lastPathComponent else { return false }
    let args = arguments(of: pid_t(pid))
    return args.count > 1 && args[1] == entryPoint
  }

  /// SIGTERM, then SIGKILL after two seconds. True once the scanner is gone.
  static func stop(pid: Int) async -> Bool {
    guard isScanner(pid: pid) else { return true }
    kill(pid_t(pid), SIGTERM)
    if await waitUntilGone(pid: pid, seconds: 2) { return true }
    guard isScanner(pid: pid) else { return true }
    kill(pid_t(pid), SIGKILL)
    return await waitUntilGone(pid: pid, seconds: 1)
  }

  private static func waitUntilGone(pid: Int, seconds: Double) async -> Bool {
    let deadline = Date().addingTimeInterval(seconds)
    while Date() < deadline {
      if !isScanner(pid: pid) { return true }
      try? await Task.sleep(nanoseconds: 50_000_000)
    }
    return !isScanner(pid: pid)
  }

  /// Re-executes this same executable in a new session with the scanner entry point. Waits until
  /// the child reports ready on a pipe, and kills it when it dies or does not answer in time.
  static func spawn(optionsJson: String) throws -> Int {
    // The generated main reads each argument as JSON, so a String argument must be a JSON string.
    guard let jsonArgument = String(data: try JSONEncoder().encode(optionsJson), encoding: .utf8) else {
      throw ScannerError("Could not encode the scanner options.")
    }
    var fds: [Int32] = [0, 0]
    guard pipe(&fds) == 0 else { throw ScannerError("Could not start the scanner.") }
    let (readEnd, writeEnd) = (fds[0], fds[1])
    defer { close(readEnd) }

    let path = executablePath()
    let args = [path, entryPoint, jsonArgument, String(readyFd)]
    var cArgs: [UnsafeMutablePointer<CChar>?] = args.map { strdup($0) }
    cArgs.append(nil)
    defer { cArgs.forEach { free($0) } }

    var attributes: posix_spawnattr_t?
    posix_spawnattr_init(&attributes)
    defer { posix_spawnattr_destroy(&attributes) }
    posix_spawnattr_setflags(&attributes, Int16(POSIX_SPAWN_SETSID | POSIX_SPAWN_CLOEXEC_DEFAULT))

    var actions: posix_spawn_file_actions_t?
    posix_spawn_file_actions_init(&actions)
    defer { posix_spawn_file_actions_destroy(&actions) }
    posix_spawn_file_actions_addopen(&actions, 0, "/dev/null", O_RDONLY, 0)
    posix_spawn_file_actions_addopen(&actions, 1, "/dev/null", O_WRONLY, 0)
    posix_spawn_file_actions_addopen(&actions, 2, "/dev/null", O_WRONLY, 0)
    posix_spawn_file_actions_adddup2(&actions, writeEnd, readyFd)

    var pid: pid_t = 0
    let status = posix_spawn(&pid, path, &actions, &attributes, cArgs, environ)
    close(writeEnd)
    guard status == 0 else { throw ScannerError("Could not start the scanner (error \(status)).") }

    switch readReadyByte(fd: readEnd) {
    case UInt8(ascii: "R"):
      return Int(pid)
    case UInt8(ascii: "B"):
      reap(child: pid)
      throw ScannerLock.busyError(ScannerLock.holder()?.mode ?? nil)
    default:
      reap(child: pid)
      throw ScannerError("The scanner did not start. Try again.")
    }
  }

  /// Called in the child once the window shows, or with "B" when another scanner runs.
  static func signalReady(fd: Int, byte: Character) {
    guard fd > 2, let value = byte.asciiValue else { return }
    var data = value
    _ = write(Int32(fd), &data, 1)
    close(Int32(fd))
  }

  private static func readReadyByte(fd: Int32) -> UInt8? {
    var pollFd = pollfd(fd: fd, events: Int16(POLLIN), revents: 0)
    let deadline = Date().addingTimeInterval(Double(readyTimeout) / 1000)
    while true {
      let remaining = Int32(max(0, deadline.timeIntervalSinceNow * 1000))
      let ready = poll(&pollFd, 1, remaining)
      if ready < 0, errno == EINTR { continue }
      guard ready > 0 else { return nil }
      var byte: UInt8 = 0
      return read(fd, &byte, 1) == 1 ? byte : nil
    }
  }

  /// Ends a child that failed the handshake: SIGTERM, then SIGKILL, and collects its exit status.
  private static func reap(child pid: pid_t) {
    var status: Int32 = 0
    for signal in [SIGTERM, SIGKILL] {
      if waitpid(pid, &status, WNOHANG) == pid { return }
      kill(pid, signal)
      for _ in 0..<20 {
        if waitpid(pid, &status, WNOHANG) == pid { return }
        usleep(50_000)
      }
    }
  }

  private static func executablePath() -> String {
    var size: UInt32 = 0
    _NSGetExecutablePath(nil, &size)
    var buffer = [CChar](repeating: 0, count: Int(size))
    _NSGetExecutablePath(&buffer, &size)
    return URL(fileURLWithPath: String(cString: buffer)).standardizedFileURL.resolvingSymlinksInPath().path
  }

  /// The argv of another process, read with KERN_PROCARGS2.
  private static func arguments(of pid: pid_t) -> [String] {
    var argmaxMib: [Int32] = [CTL_KERN, KERN_ARGMAX]
    var argmax: Int32 = 0
    var argmaxSize = MemoryLayout<Int32>.size
    guard sysctl(&argmaxMib, 2, &argmax, &argmaxSize, nil, 0) == 0, argmax > 0 else { return [] }
    var mib: [Int32] = [CTL_KERN, KERN_PROCARGS2, pid]
    var size = Int(argmax)
    var buffer = [UInt8](repeating: 0, count: size)
    guard sysctl(&mib, 3, &buffer, &size, nil, 0) == 0, size > 4 else { return [] }
    let argc = buffer.withUnsafeBytes { $0.load(as: Int32.self) }
    var index = 4
    while index < size, buffer[index] != 0 { index += 1 }  // executable path
    while index < size, buffer[index] == 0 { index += 1 }  // padding
    var args: [String] = []
    while args.count < argc, index < size {
      let start = index
      while index < size, buffer[index] != 0 { index += 1 }
      args.append(String(decoding: buffer[start..<index], as: UTF8.self))
      index += 1
    }
    return args
  }
}
