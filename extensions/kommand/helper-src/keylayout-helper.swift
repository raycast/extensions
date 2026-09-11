import Carbon
import Foundation

private let specialKeys: [Int: String] = [
  36: "↩",
  51: "⌫",
  117: "⌦",
  119: "↘",
  53: "⎋",
  114: "?⃝",
  115: "↖",
  49: "Space",
  48: "⇥",
  116: "⇞",
  121: "⇟",
  126: "↑",
  124: "→",
  125: "↓",
  123: "←",
  122: "F1",
  120: "F2",
  99: "F3",
  118: "F4",
  96: "F5",
  97: "F6",
  98: "F7",
  100: "F8",
  101: "F9",
  109: "F10",
  103: "F11",
  111: "F12",
  105: "F13",
  107: "F14",
  113: "F15",
  106: "F16",
  64: "F17",
  79: "F18",
  80: "F19",
  90: "F20",
  82: "0\u{20e3}",
  83: "1\u{20e3}",
  84: "2\u{20e3}",
  85: "3\u{20e3}",
  86: "4\u{20e3}",
  87: "5\u{20e3}",
  88: "6\u{20e3}",
  89: "7\u{20e3}",
  91: "8\u{20e3}",
  92: "9\u{20e3}",
  71: "☒\u{20e3}",
  65: ".\u{20e3}",
  75: "/\u{20e3}",
  76: "↩\u{20e3}",
  81: "=\u{20e3}",
  78: "-\u{20e3}",
  67: "*\u{20e3}",
  69: "+\u{20e3}",
  74: "Mute",
  72: "Volume Up",
  73: "Volume Down",
]

private func characterForKeyCode(_ keyCode: Int) -> String? {
  guard let inputSource = TISCopyCurrentASCIICapableKeyboardLayoutInputSource()?.takeRetainedValue(),
        let layoutDataRef = TISGetInputSourceProperty(inputSource, kTISPropertyUnicodeKeyLayoutData)
  else {
    return nil
  }

  let layoutData = unsafeBitCast(layoutDataRef, to: CFData.self)
  let keyboardLayout = unsafeBitCast(CFDataGetBytePtr(layoutData), to: UnsafePointer<UCKeyboardLayout>.self)

  var deadKeyState: UInt32 = 0
  var chars = [UniChar](repeating: 0, count: 4)
  var actualLength: Int = 0

  let status = UCKeyTranslate(
    keyboardLayout,
    UInt16(keyCode),
    UInt16(kUCKeyActionDisplay),
    0,
    UInt32(LMGetKbdType()),
    OptionBits(kUCKeyTranslateNoDeadKeysBit),
    &deadKeyState,
    chars.count,
    &actualLength,
    &chars
  )

  guard status == noErr, actualLength > 0 else {
    return nil
  }

  return String(utf16CodeUnits: chars, count: actualLength)
}

private func labelForKeyCode(_ keyCode: Int) -> String {
  if let special = specialKeys[keyCode] {
    return special
  }

  if let char = characterForKeyCode(keyCode), !char.isEmpty {
    let upper = char.uppercased()
    return upper.count == char.count ? upper : char
  }

  return "Key\(keyCode)"
}

let codes = Array(Set(CommandLine.arguments.dropFirst().compactMap(Int.init))).sorted()
let result = Dictionary(uniqueKeysWithValues: codes.map { (String($0), labelForKeyCode($0)) })
let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
