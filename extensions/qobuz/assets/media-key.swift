import ApplicationServices
import Cocoa

// IOKit ev_keymap.h media key codes.
let keyCodes: [String: Int32] = [
  "play": 16, // NX_KEYTYPE_PLAY — play/pause toggle
  "next": 17, // NX_KEYTYPE_NEXT — skip to next track
  "previous": 18, // NX_KEYTYPE_PREVIOUS — skip to previous track
  "forward": 19, // NX_KEYTYPE_FAST — fast-forward within the track
  "rewind": 20, // NX_KEYTYPE_REWIND — rewind within the track
]

func postMediaKey(_ key: Int32) {
  func send(down: Bool) {
    let flags = NSEvent.ModifierFlags(rawValue: down ? 0xA00 : 0xB00)
    let data1 = Int((key << 16) | (down ? 0xA00 : 0xB00))
    let event = NSEvent.otherEvent(
      with: .systemDefined,
      location: .zero,
      modifierFlags: flags,
      timestamp: 0,
      windowNumber: 0,
      context: nil,
      subtype: 8,
      data1: data1,
      data2: -1
    )
    event?.cgEvent?.post(tap: .cghidEventTap)
  }
  send(down: true)
  usleep(1000)
  send(down: false)
}

let fail = { (message: String, code: Int32) in
  FileHandle.standardError.write(Data("\(message)\n".utf8))
  exit(code)
}

guard let name = CommandLine.arguments.dropFirst().first, let key = keyCodes[name] else {
  fail("usage: media-key <play|next|previous|forward|rewind>", 64)
  exit(64)
}

guard AXIsProcessTrusted() else {
  fail(
    "not authorized — grant your terminal Accessibility access in System Settings → Privacy & Security → Accessibility",
    77
  )
  exit(77)
}

postMediaKey(key)
