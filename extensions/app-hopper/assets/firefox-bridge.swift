import Darwin
import Foundation

// Firefox owns this process. Only framed JSON is written to stdout.
let maxBytes = 1024 * 1024
let timeoutSeconds = 5
func defaultBridgeDirectory(executable: String, home: URL) -> String {
  home.appendingPathComponent(
    URL(fileURLWithPath: executable).lastPathComponent.hasPrefix("zen-bridge-")
      ? "Library/Application Support/raycast-app-hopper-zen"
      : "Library/Application Support/raycast-yabai-firefox"
  ).path
}

let directory: String = {
  let args = CommandLine.arguments
  if args.count == 3 && args[1] == "--directory" { return args[2] }
  return defaultBridgeDirectory(executable: args[0], home: FileManager.default.homeDirectoryForCurrentUser)
}()
let session = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased().prefix(16))
let socketPath = directory + "/" + session + ".sock"

final class Reply {
  let semaphore = DispatchSemaphore(value: 0)
  var data: Data?
}

let pendingLock = NSLock()
let outputLock = NSLock()
var pending: [String: Reply] = [:]
let capacity = DispatchSemaphore(value: 16)

func writeAll(_ fd: Int32, _ data: Data) -> Bool {
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

func readExactly(_ count: Int) -> Data? {
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

func encode(_ value: [String: Any]) -> Data {
  return (try? JSONSerialization.data(withJSONObject: value)) ?? Data("{\"error\":\"Invalid response\"}".utf8)
}

func respond(_ fd: Int32, _ value: [String: Any]) {
  _ = writeAll(fd, encode(value) + Data([10]))
}

func forward(_ command: [String: Any], client: Int32) {
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

func handleClient(_ client: Int32) {
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

func run() throws {
  signal(SIGPIPE, SIG_IGN)
  umask(0o077)
  try FileManager.default.createDirectory(atPath: directory, withIntermediateDirectories: true,
                                        attributes: [.posixPermissions: 0o700])
  guard chmod(directory, 0o700) == 0 else { throw POSIXError(.EACCES) }
  var address = sockaddr_un()
  let pathBytes = Array(socketPath.utf8) + [UInt8(0)]
  guard pathBytes.count <= MemoryLayout.size(ofValue: address.sun_path) else {
    throw POSIXError(.ENAMETOOLONG)
  }
  address.sun_family = sa_family_t(AF_UNIX)
  address.sun_len = UInt8(MemoryLayout<sockaddr_un>.size)
  withUnsafeMutableBytes(of: &address.sun_path) { target in
    target.copyBytes(from: pathBytes)
  }
  let listener = socket(AF_UNIX, SOCK_STREAM, 0)
  guard listener >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
  defer { close(listener); unlink(socketPath) }
  let bound = withUnsafePointer(to: &address) { pointer in
    pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
      Darwin.bind(listener, $0, socklen_t(MemoryLayout<sockaddr_un>.size))
    }
  }
  guard bound == 0, chmod(socketPath, 0o600) == 0, listen(listener, 16) == 0 else {
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
    let encoded = encode(response)
    pendingLock.lock()
    if let reply = pending[requestId] {
      reply.data = encoded
      reply.semaphore.signal()
    }
    pendingLock.unlock()
  }
}

do {
  try run()
} catch {
  fputs("App Hopper Firefox bridge could not start: \(error.localizedDescription)\n", stderr)
  exit(1)
}
