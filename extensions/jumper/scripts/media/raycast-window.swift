// Prints Raycast's launcher window as "<windowID> <x> <y> <width> <height>" (points, top-left origin),
// or exits 1 while it is hidden. Don't filter by size: it is only 64pt tall in compact mode (empty root
// search). Used by scripts/media/store_media.py.
import CoreGraphics
import Foundation

let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
let raycast = windows.compactMap { info -> (Int, CGRect)? in
  guard info[kCGWindowOwnerName as String] as? String == "Raycast",
    info[kCGWindowName as String] as? String == "Main Window",
    let id = info[kCGWindowNumber as String] as? Int,
    let boundsDict = info[kCGWindowBounds as String] as? NSDictionary,
    let bounds = CGRect(dictionaryRepresentation: boundsDict)
  else { return nil }
  return (id, bounds)
}.max { $0.1.width * $0.1.height < $1.1.width * $1.1.height }

guard let (id, b) = raycast else { exit(1) }
print(id, Int(b.minX), Int(b.minY), Int(b.width), Int(b.height))
