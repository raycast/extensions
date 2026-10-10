import Darwin
import Foundation
import IOKit
import IOKit.hidsystem
import RaycastSwiftMacros

private func failure(_ message: String) -> NSError {
  NSError(domain: "com.raycast.caps-lock", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
}

// Keep the inode in place: unlinking it could let waiting processes use different locks.
private func acquireLock() throws -> Int32 {
  var directory = [CChar](repeating: 0, count: Int(PATH_MAX))
  let length = confstr(_CS_DARWIN_USER_TEMP_DIR, &directory, directory.count)
  guard length > 0, length <= directory.count else {
    throw failure("Cannot locate the user's temporary directory")
  }
  let path = String(cString: directory) + "/com.raycast.caps-lock.lock"
  guard path.utf8.count < Int(PATH_MAX) else {
    throw failure("Caps Lock lock path is too long")
  }
  let descriptor = open(path, O_CREAT | O_RDWR | O_CLOEXEC | O_NOFOLLOW, mode_t(0o600))
  guard descriptor != -1 else {
    throw failure("Cannot open Caps Lock lock: \(String(cString: strerror(errno)))")
  }
  do {
    var info = stat()
    guard fstat(descriptor, &info) == 0,
      (info.st_mode & S_IFMT) == S_IFREG,
      info.st_uid == geteuid(), info.st_nlink == 1
    else {
      throw failure("Caps Lock lock is not a regular file owned by this user")
    }
    while flock(descriptor, LOCK_EX) == -1 {
      if errno == EINTR { continue }
      throw failure("Cannot acquire Caps Lock lock: \(String(cString: strerror(errno)))")
    }
    return descriptor
  } catch {
    close(descriptor)
    throw error
  }
}

// Change the real modifier lock without synthesizing key presses or changing mappings.
@raycast func toggleCapsLock() throws -> Bool {
  let descriptor = try acquireLock()
  defer { close(descriptor) }

  let service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching(kIOHIDSystemClass))
  guard service != IO_OBJECT_NULL else {
    throw failure("macOS keyboard service is unavailable")
  }
  var connection: io_connect_t = IO_OBJECT_NULL
  let opened = IOServiceOpen(service, mach_task_self_, UInt32(kIOHIDParamConnectType), &connection)
  IOObjectRelease(service)
  guard opened == KERN_SUCCESS else {
    throw failure(String(format: "Cannot open macOS keyboard service: 0x%x", opened))
  }
  defer { IOServiceClose(connection) }

  var state = false
  let read = IOHIDGetModifierLockState(connection, Int32(kIOHIDCapsLockState), &state)
  guard read == KERN_SUCCESS else {
    throw failure(String(format: "Cannot read Caps Lock: 0x%x", read))
  }
  let target = !state
  var result = IOHIDSetModifierLockState(connection, Int32(kIOHIDCapsLockState), target)
  if result == KERN_SUCCESS {
    result = IOHIDGetModifierLockState(connection, Int32(kIOHIDCapsLockState), &state)
  }
  guard result == KERN_SUCCESS, state == target else {
    throw failure(String(format: "macOS did not confirm the requested Caps Lock state (0x%x)", result))
  }
  return state
}
