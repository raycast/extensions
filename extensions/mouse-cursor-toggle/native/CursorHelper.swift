import CoreGraphics
import Darwin
import Foundation

@_silgen_name("_CGSDefaultConnection")
private func CGSDefaultConnection() -> UInt32

@_silgen_name("CGSSetConnectionProperty")
private func CGSSetConnectionProperty(
  _ connection: UInt32,
  _ target: UInt32,
  _ key: CFString,
  _ value: CFTypeRef
) -> CGError

guard CommandLine.arguments.count == 3 else {
  fputs("Usage: cursor-helper <state-file> <token>\n", stderr)
  exit(EXIT_FAILURE)
}

let statePath = CommandLine.arguments[1]
let controlPath = "\(statePath).control"
let errorPath = "\(statePath).error"
let lockPath = "\(statePath).lock"
let token = CommandLine.arguments[2]
let lockFileDescriptor = open(lockPath, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)

guard lockFileDescriptor >= 0 else {
  fputs("Could not open the cursor helper lock file.\n", stderr)
  exit(EXIT_FAILURE)
}

guard flock(lockFileDescriptor, LOCK_EX | LOCK_NB) == 0 else {
  fputs("Another cursor helper already owns the lock file.\n", stderr)
  close(lockFileDescriptor)
  exit(EXIT_SUCCESS)
}

signal(SIGTERM, SIG_IGN)
signal(SIGINT, SIG_IGN)

let terminationSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
let interruptSource = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
var controlFileDescriptor: Int32 = -1
var isCursorHidden = false

func cleanUpAndExit(_ status: Int32) -> Never {
  if isCursorHidden {
    CGDisplayShowCursor(CGMainDisplayID())
    isCursorHidden = false
  }

  unlink(controlPath)
  unlink(statePath)
  unlink(lockPath)
  flock(lockFileDescriptor, LOCK_UN)
  close(lockFileDescriptor)
  exit(status)
}

func failAndExit(_ message: String) -> Never {
  try? "\(message)\n".write(toFile: errorPath, atomically: true, encoding: .utf8)
  cleanUpAndExit(EXIT_FAILURE)
}

terminationSource.setEventHandler {
  cleanUpAndExit(EXIT_SUCCESS)
}

interruptSource.setEventHandler {
  cleanUpAndExit(EXIT_SUCCESS)
}

terminationSource.resume()
interruptSource.resume()

unlink(statePath)
unlink(controlPath)
unlink(errorPath)
guard mkfifo(controlPath, S_IRUSR | S_IWUSR) == 0 else {
  failAndExit("Could not create the cursor helper control pipe.")
}

controlFileDescriptor = open(controlPath, O_RDWR)
guard controlFileDescriptor >= 0 else {
  failAndExit("Could not open the cursor helper control pipe.")
}

DispatchQueue.global(qos: .utility).async {
  while true {
    var buffer = [UInt8](repeating: 0, count: 512)
    let byteCount = read(controlFileDescriptor, &buffer, buffer.count)

    if byteCount > 0 {
      let message = String(decoding: buffer.prefix(byteCount), as: UTF8.self)
        .trimmingCharacters(in: .whitespacesAndNewlines)

      if message == "STOP \(token)" {
        DispatchQueue.main.async {
          cleanUpAndExit(EXIT_SUCCESS)
        }
        return
      }
    } else if byteCount < 0 && errno != EINTR {
      return
    }
  }
}

let connection = CGSDefaultConnection()
let backgroundCursorResult = CGSSetConnectionProperty(
  connection,
  connection,
  "SetsCursorInBackground" as CFString,
  kCFBooleanTrue
)

guard backgroundCursorResult == .success else {
  failAndExit("WindowServer refused background cursor control.")
}

guard CGDisplayHideCursor(CGMainDisplayID()) == .success else {
  failAndExit("Core Graphics refused to hide the cursor.")
}

isCursorHidden = true

let state = "\(token)\n"
do {
  try state.write(toFile: statePath, atomically: true, encoding: .utf8)
  chmod(statePath, S_IRUSR | S_IWUSR)
} catch {
  failAndExit("Could not write the cursor helper state.")
}

dispatchMain()
