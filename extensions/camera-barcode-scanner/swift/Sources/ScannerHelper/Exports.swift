import AppKit
import Foundation
import RaycastSwiftMacros

/// Cheap checks before the Raycast window closes, so a failure is still visible.
@raycast func checkScanner(optionsJson: String, once: Bool) async throws {
  let options = try ScannerOptions.parse(optionsJson)
  try Cameras.checkAvailable(option: options.camera)
  if once { try Typing.requireAccessibility() }
  if let holder = ScannerLock.holder() { throw ScannerLock.busyError(holder.mode) }
}

/// Starts the detached scanner and returns its pid once its window shows.
@raycast func startScanner(optionsJson: String) async throws -> Int {
  let options = try ScannerOptions.parse(optionsJson)
  try Cameras.checkAvailable(option: options.camera)
  if let holder = ScannerLock.holder() { throw ScannerLock.busyError(holder.mode) }
  return try ScannerProcess.spawn(optionsJson: optionsJson)
}

/// The pid of the running toggle scanner: the stored pid, else the lock holder. Nil when none runs.
@raycast func findScanner(pid: Int) async -> Int? {
  if ScannerProcess.isScanner(pid: pid) { return pid }
  if let holder = ScannerLock.holder(), holder.mode == .toggle, let holderPid = holder.pid,
    ScannerProcess.isScanner(pid: holderPid)
  {
    return holderPid
  }
  return nil
}

/// Stops the scanner. True only when the process is gone.
@raycast func stopScanner(pid: Int) async -> Bool {
  await ScannerProcess.stop(pid: pid)
}

/// Opens the window, types the first code it reads and closes. True when a code was typed.
@raycast func scanOnce(optionsJson: String) async throws -> Bool {
  let options = try ScannerOptions.parse(optionsJson)
  try Cameras.checkAvailable(option: options.camera)
  try Typing.requireAccessibility()
  guard let lock = try ScannerLock.acquire(mode: .once) else {
    throw ScannerLock.busyError(ScannerLock.holder()?.mode ?? nil)
  }
  defer { lock.release() }
  return await MainActor.run {
    ScannerController(options: options, once: true).run()
  }
}

/// Entry point of the detached scanner process (ScannerProcess.spawn). Not called from TypeScript.
@raycast func runScanner(optionsJson: String, readyFd: Int) async throws {
  let options = try ScannerOptions.parse(optionsJson)
  guard let lock = try ScannerLock.acquire(mode: .toggle) else {
    ScannerProcess.signalReady(fd: readyFd, byte: "B")
    return
  }
  defer { lock.release() }
  await MainActor.run {
    _ = ScannerController(options: options, once: false).run {
      ScannerProcess.signalReady(fd: readyFd, byte: "R")
    }
  }
}
