import Darwin
import Foundation

enum FirefoxBridge {
  // Firefox owns this process. Only framed JSON is written to stdout.
  static let maxBytes = 1024 * 1024
  static let timeoutSeconds = 5
  static var directory = ""
  static let session = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased().prefix(16))
  static var socketPath: String { directory + "/" + session + ".sock" }

  final class Reply {
    let semaphore = DispatchSemaphore(value: 0)
    var data: Data?
  }

  static let pendingLock = NSLock()
  static let outputLock = NSLock()
  static var pending: [String: Reply] = [:]
  static let capacity = DispatchSemaphore(value: 16)

  static func writeAll(_ fd: Int32, _ data: Data) -> Bool {
    return data.withUnsafeBytes { bytes in
      var offset = 0
      while offset < bytes.count {
        let count = Darwin.write(fd, bytes.baseAddress!.advanced(by: offset), bytes.count - offset)
        if count < 0 && errno == EINTR { continue }
        if count <= 0 { return false }
        offset += count
      }
      return true
    }
  }

  static func readExactly(_ count: Int) -> Data? {
    var data = Data(count: count)
    let ok = data.withUnsafeMutableBytes { bytes -> Bool in
      var offset = 0
      while offset < count {
        let received = Darwin.read(STDIN_FILENO, bytes.baseAddress!.advanced(by: offset), count - offset)
        if received < 0 && errno == EINTR { continue }
        if received <= 0 { return false }
        offset += received
      }
      return true
    }
    return ok ? data : nil
  }

  static func encode(_ value: [String: Any]) -> Data {
    return (try? JSONSerialization.data(withJSONObject: value)) ?? Data("{\"error\":\"Invalid response\"}".utf8)
  }

  static func respond(_ fd: Int32, _ value: [String: Any]) {
    _ = writeAll(fd, encode(value) + Data([10]))
  }

  static func forward(_ command: [String: Any], client: Int32) {
    if command["command"] as? String == "shutdown" {
      respond(client, ["data": true])
      unlink(socketPath)
      exit(0)
    }
    guard let name = command["command"] as? String, ["list", "focus", "status"].contains(name) else {
      respond(client, ["error": "Unsupported Firefox command"])
      return
    }
    let requestId = UUID().uuidString
    var message = command
    message["requestId"] = requestId
    let reply = Reply()
    pendingLock.lock()
    pending[requestId] = reply
    pendingLock.unlock()
    defer {
      pendingLock.lock()
      pending.removeValue(forKey: requestId)
      pendingLock.unlock()
    }
    let body = encode(message)
    var size = UInt32(body.count).littleEndian
    let header = withUnsafeBytes(of: &size) { Data($0) }
    outputLock.lock()
    let sent = writeAll(STDOUT_FILENO, header + body)
    outputLock.unlock()
    guard sent else {
      respond(client, ["error": "Firefox disconnected"])
      return
    }
    let received = reply.semaphore.wait(timeout: .now() + .seconds(timeoutSeconds)) == .success
    pendingLock.lock()
    let response = reply.data
    pendingLock.unlock()
    if received, let response = response {
      _ = writeAll(client, response + Data([10]))
    } else {
      respond(client, ["error": "Firefox request timed out"])
    }
  }

  static func handleClient(_ client: Int32) {
    defer { close(client); capacity.signal() }
    var timeout = timeval(tv_sec: timeoutSeconds, tv_usec: 0)
    setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
    setsockopt(client, SOL_SOCKET, SO_SNDTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
    var data = Data()
    var buffer = [UInt8](repeating: 0, count: 4096)
    while data.count <= maxBytes {
      let count = Darwin.read(client, &buffer, buffer.count)
      if count < 0 && errno == EINTR { continue }
      guard count > 0 else { return }
      data.append(contentsOf: buffer.prefix(count))
      if data.count > maxBytes { break }
      if let newline = data.firstIndex(of: 10) {
        guard let command = (try? JSONSerialization.jsonObject(with: data.prefix(upTo: newline))) as? [String: Any] else {
          respond(client, ["error": "Invalid Firefox request"])
          return
        }
        forward(command, client: client)
        return
      }
    }
    respond(client, ["error": "Firefox request is too large"])
  }

  static func withSocketAddress(
    _ path: String, _ operation: (UnsafePointer<sockaddr>, socklen_t) -> Int32
  ) throws -> Int32 {
    var address = sockaddr_un()
    let pathBytes = Array(path.utf8) + [UInt8(0)]
    guard pathBytes.count <= MemoryLayout.size(ofValue: address.sun_path) else {
      throw POSIXError(.ENAMETOOLONG)
    }
    address.sun_family = sa_family_t(AF_UNIX)
    address.sun_len = UInt8(MemoryLayout<sockaddr_un>.size)
    withUnsafeMutableBytes(of: &address.sun_path) { target in
      target.copyBytes(from: pathBytes)
    }
    return withUnsafePointer(to: &address) { pointer in
      pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        operation($0, socklen_t(MemoryLayout<sockaddr_un>.size))
      }
    }
  }

  private static func peerExecutable(_ fd: Int32) -> URL? {
    var token = audit_token_t()
    var length = socklen_t(MemoryLayout.size(ofValue: token))
    guard getsockopt(fd, SOL_LOCAL, LOCAL_PEERTOKEN, &token, &length) == 0 else { return nil }
    var path = [CChar](repeating: 0, count: 4 * Int(MAXPATHLEN))
    guard proc_pidpath_audittoken(&token, &path, UInt32(path.count)) > 0 else { return nil }
    return URL(fileURLWithPath: String(cString: path)).resolvingSymlinksInPath()
  }

  static func stopLegacySessions(args: [String]) throws {
    guard let legacy = args.first, legacy.hasPrefix("/"),
      args.dropFirst().allSatisfy({ $0.range(of: #"^[a-f0-9]{16}\.sock$"#, options: .regularExpression) != nil })
    else { throw POSIXError(.EINVAL) }
    let legacyDirectory = URL(fileURLWithPath: legacy, isDirectory: true).resolvingSymlinksInPath().path
    let executable = URL(fileURLWithPath: CommandLine.arguments[0]).resolvingSymlinksInPath().path
    let extensions = URL(fileURLWithPath: executable)
      .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    let previousExecutable = extensions.appendingPathComponent("app-hopper/assets/compiled_raycast_swift/app-hopper-native")
      .resolvingSymlinksInPath().path

    signal(SIGPIPE, SIG_IGN)
    for name in args.dropFirst() {
      let fd = socket(AF_UNIX, SOCK_STREAM, 0)
      guard fd >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
      defer { close(fd) }
      var timeout = timeval(tv_sec: 1, tv_usec: 0)
      setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
      setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
      let connected = try withSocketAddress(legacy + "/" + name) { Darwin.connect(fd, $0, $1) }
      if connected != 0 {
        if errno == ENOENT || errno == ECONNREFUSED { continue }
        throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
      }

      // Check the kernel's peer identity on this connection before sending any command to a shared socket.
      guard let peer = peerExecutable(fd) else { continue }
      let standaloneBridge = peer.deletingLastPathComponent().path == legacyDirectory &&
        peer.lastPathComponent.range(of: #"^firefox-bridge-[a-f0-9]{12}$"#, options: .regularExpression) != nil
      guard peer.path == executable || peer.path == previousExecutable || standaloneBridge else { continue }

      guard writeAll(fd, Data("{\"command\":\"shutdown\"}\n".utf8)) else {
        throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
      }
      var reply = [UInt8](repeating: 0, count: 128)
      let count = Darwin.recv(fd, &reply, reply.count, MSG_WAITALL)
      guard count > 0,
        let response = try? JSONSerialization.jsonObject(with: Data(reply.prefix(count))) as? [String: Bool],
        response["data"] == true else {
        throw NSError(domain: "AppHopper", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "Could not stop the old Firefox helper. Restart Firefox and try again."
        ])
      }
    }
  }

  static func run() throws {
    signal(SIGPIPE, SIG_IGN)
    umask(0o077)
    try FileManager.default.createDirectory(atPath: directory, withIntermediateDirectories: true,
                                          attributes: [.posixPermissions: 0o700])
    guard chmod(directory, 0o700) == 0 else { throw POSIXError(.EACCES) }
    let listener = socket(AF_UNIX, SOCK_STREAM, 0)
    guard listener >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
    defer { close(listener) }
    let bound = try withSocketAddress(socketPath) { Darwin.bind(listener, $0, $1) }
    guard bound == 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
    defer { unlink(socketPath) }
    guard chmod(socketPath, 0o600) == 0, listen(listener, 16) == 0 else {
      throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
    }
    // Remove this session's socket on normal Firefox termination, including SIGTERM.
    signal(SIGTERM, SIG_IGN)
    let termination = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .global())
    termination.setEventHandler { unlink(socketPath); exit(0) }
    termination.resume()
    defer { termination.cancel() }
    DispatchQueue.global().async {
      while true {
        let client = accept(listener, nil, nil)
        if client < 0 { return }
        if capacity.wait(timeout: .now()) != .success { close(client); continue }
        DispatchQueue.global().async { handleClient(client) }
      }
    }
    while let header = readExactly(4) {
      let size = header.enumerated().reduce(UInt32(0)) { $0 | (UInt32($1.element) << (8 * $1.offset)) }
      guard size > 0, size <= maxBytes, let body = readExactly(Int(size)),
            let message = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any] else {
        throw POSIXError(.EINVAL)
      }
      guard let requestId = message["requestId"] as? String else { continue }
      var response: [String: Any] = [:]
      if let error = message["error"] as? String { response["error"] = error }
      else if let data = message["data"] { response["data"] = data }
      else { response["error"] = "Invalid Firefox response" }
      if let browserProcess = browserProcessIdentity(getppid()) {
        response["browserProcess"] = browserProcess.json
      }
      let encoded = encode(response)
      pendingLock.lock()
      if let reply = pending[requestId] {
        reply.data = encoded
        reply.semaphore.signal()
      }
      pendingLock.unlock()
    }
  }

  static func start(args: [String]) throws {
    guard args.count == 2, args[0] == "--directory", args[1].hasPrefix("/") else {
      throw POSIXError(.EINVAL)
    }
    directory = args[1]
    try run()
  }
}
