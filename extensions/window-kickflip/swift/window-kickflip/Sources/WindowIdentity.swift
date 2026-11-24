import CoreGraphics
import Foundation

// CGWindowList info is ordered front to back, so the first normal window owned by
// the frontmost app is its focused window. Tiny windows are helper surfaces, not targets.
func frontWindowID(in windows: [[String: Any]], processID: Int32) -> CGWindowID? {
  for info in windows {
    guard (info[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value == processID,
          (info[kCGWindowLayer as String] as? NSNumber)?.intValue == 0,
          (info[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1 > 0,
          let number = (info[kCGWindowNumber as String] as? NSNumber)?.uint32Value,
          let bounds = info[kCGWindowBounds as String] as? NSDictionary,
          let frame = CGRect(dictionaryRepresentation: bounds),
          frame.width >= 40, frame.height >= 40 else { continue }
    return number
  }
  return nil
}
