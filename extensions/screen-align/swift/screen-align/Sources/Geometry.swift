import AppKit
import CoreGraphics

// Everything here works in the CoreGraphics global display space: points, origin at the
// top-left of the main display, y growing downward. AppKit's NSScreen.frame uses the
// opposite y direction, so conversions live in Overlay.swift and nowhere else.

struct DisplayInfo: Codable {
    let id: UInt32
    let uuid: String
    let name: String
    let isMain: Bool
    let x: Int
    let y: Int
    let width: Int
    let height: Int
    let widthMM: Double
    let heightMM: Double
    /// Points per millimeter, measured along each axis separately: EDID rounding means a
    /// panel's reported mm are rarely square, and vertical alignment only cares about Y.
    let ptPerMMX: Double
    let ptPerMMY: Double

    var top: Int { y }
    var bottom: Int { y + height }
    var left: Int { x }
    var right: Int { x + width }
    var centerY: Double { Double(y) + Double(height) / 2 }
    var centerX: Double { Double(x) + Double(width) / 2 }

    /// Points per millimeter along whichever axis is being aligned.
    func ptPerMM(_ axis: Axis) -> Double {
        axis == .vertical ? ptPerMMY : ptPerMMX
    }

    /// Where this display sits along the free axis.
    func position(_ axis: Axis) -> Int {
        axis == .vertical ? y : x
    }

    /// Its length along the free axis.
    func extent(_ axis: Axis) -> Int {
        axis == .vertical ? height : width
    }
}

/// The direction a display is still free to move in. macOS pins displays flush against
/// each other along the edge they share and silently undoes anything else, so only the
/// perpendicular axis can be adjusted: side by side leaves vertical free, stacked leaves
/// horizontal free.
enum Axis: String, Codable {
    case vertical
    case horizontal
}

func freeAxis(target: DisplayInfo, main: DisplayInfo) -> Axis {
    let sideBySide = target.left >= main.right || target.right <= main.left
    let stacked = target.top >= main.bottom || target.bottom <= main.top
    if sideBySide { return .vertical }
    if stacked { return .horizontal }
    return .vertical
}

/// Named along the free axis rather than by edge, so one set covers both arrangements:
/// start is tops or left edges, end is bottoms or right edges.
enum AlignMode: String, Codable {
    case start, center, end
}

enum Side: String, Codable {
    case left, right, above, below
}

/// What the commands hand back: where everything sits, plus which way it can still move.
struct Arrangement: Codable {
    let axis: Axis
    let displays: [DisplayInfo]
}

func arrangement() -> Arrangement {
    let displays = snapshot()
    guard let main = displays.first(where: \.isMain),
          let target = displays.first(where: { !$0.isMain })
    else { return Arrangement(axis: .vertical, displays: displays) }
    return Arrangement(axis: freeAxis(target: target, main: main), displays: displays)
}

enum ScreenAlignError: LocalizedError {
    case noSuchDisplay(UInt32)
    case needTwoDisplays
    case configurationFailed(Int32)
    case overlayDidNotStart

    var errorDescription: String? {
        switch self {
        case .noSuchDisplay(let id): return "Display \(id) is no longer connected"
        case .needTwoDisplays: return "Connect a second display first"
        case .configurationFailed(let code): return "macOS refused the arrangement change (CGError \(code))"
        case .overlayDidNotStart: return "The ruler overlay did not start"
        }
    }
}

func activeDisplayIDs() -> [CGDirectDisplayID] {
    // Touching NSScreen first establishes this process's window server connection.
    // Without it CGGetActiveDisplayList can return success with a count of zero in a
    // freshly launched command-line process — and Raycast spawns a fresh one per call.
    let fromAppKit = NSScreen.screens.compactMap(\.displayID)
    var count: UInt32 = 0
    guard CGGetActiveDisplayList(0, nil, &count) == .success, count > 0 else { return fromAppKit }
    var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
    guard CGGetActiveDisplayList(count, &ids, &count) == .success else { return fromAppKit }
    return Array(ids.prefix(Int(count)))
}

private func displayUUID(_ id: CGDirectDisplayID) -> String {
    guard let ref = CGDisplayCreateUUIDFromDisplayID(id) else { return "display-\(id)" }
    return CFUUIDCreateString(nil, ref.takeRetainedValue()) as String
}

private func displayName(_ id: CGDirectDisplayID) -> String {
    let match = NSScreen.screens.first {
        ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == id
    }
    return match?.localizedName ?? "Display \(id)"
}

func describe(_ id: CGDirectDisplayID) -> DisplayInfo {
    let bounds = CGDisplayBounds(id)
    let mm = CGDisplayScreenSize(id)
    return DisplayInfo(
        id: id,
        uuid: displayUUID(id),
        name: displayName(id),
        isMain: CGDisplayIsMain(id) != 0,
        x: Int(bounds.origin.x.rounded()),
        y: Int(bounds.origin.y.rounded()),
        width: Int(bounds.width.rounded()),
        height: Int(bounds.height.rounded()),
        widthMM: Double(mm.width),
        heightMM: Double(mm.height),
        ptPerMMX: mm.width > 0 ? Double(bounds.width) / Double(mm.width) : 0,
        ptPerMMY: mm.height > 0 ? Double(bounds.height) / Double(mm.height) : 0
    )
}

/// Left-to-right, then top-to-bottom, so "the display next to the main one" is stable.
func snapshot() -> [DisplayInfo] {
    activeDisplayIDs().map(describe).sorted { ($0.x, $0.y) < ($1.x, $1.y) }
}

func mainDisplay() -> DisplayInfo? {
    snapshot().first { $0.isMain }
}

/// The display the commands act on by default: the first non-main one, nearest the main
/// display horizontally.
func defaultTarget() -> DisplayInfo? {
    guard let main = mainDisplay() else { return nil }
    return snapshot()
        .filter { !$0.isMain }
        .min { a, b in
            abs(a.x - main.x) < abs(b.x - main.x)
        }
}

func display(_ id: CGDirectDisplayID) throws -> DisplayInfo {
    guard activeDisplayIDs().contains(id) else { throw ScreenAlignError.noSuchDisplay(id) }
    return describe(id)
}

/// Apply origins in one transaction. macOS normalizes the result: it removes gaps and
/// overlaps, so a requested x may come back snapped to the neighboring edge. Vertical
/// offsets are honored as asked.
func setOrigins(_ origins: [CGDirectDisplayID: CGPoint], permanent: Bool = true) throws {
    guard !origins.isEmpty else { return }
    var config: CGDisplayConfigRef?
    let begin = CGBeginDisplayConfiguration(&config)
    guard begin == .success, let config else { throw ScreenAlignError.configurationFailed(begin.rawValue) }
    for (id, origin) in origins {
        let err = CGConfigureDisplayOrigin(config, id, Int32(origin.x.rounded()), Int32(origin.y.rounded()))
        if err != .success {
            CGCancelDisplayConfiguration(config)
            throw ScreenAlignError.configurationFailed(err.rawValue)
        }
    }
    let complete = CGCompleteDisplayConfiguration(config, permanent ? .permanently : .forSession)
    guard complete == .success else { throw ScreenAlignError.configurationFailed(complete.rawValue) }
}

func moveDisplay(_ id: CGDirectDisplayID, toX x: Int, y: Int) throws -> [DisplayInfo] {
    try setOrigins([id: CGPoint(x: x, y: y)])
    return snapshot()
}

/// Nudge one display along the free axis by a signed number of points.
func nudgeDisplay(_ id: CGDirectDisplayID, by delta: Int, along axis: Axis) throws -> [DisplayInfo] {
    let info = try display(id)
    switch axis {
    case .vertical: return try moveDisplay(id, toX: info.x, y: info.y + delta)
    case .horizontal: return try moveDisplay(id, toX: info.x + delta, y: info.y)
    }
}

func alignedOrigin(target: DisplayInfo, to main: DisplayInfo, mode: AlignMode, axis: Axis) -> CGPoint {
    let aligned: Int
    switch mode {
    case .start:
        aligned = main.position(axis)
    case .end:
        aligned = main.position(axis) + main.extent(axis) - target.extent(axis)
    case .center:
        let mainCenter = Double(main.position(axis)) + Double(main.extent(axis)) / 2
        aligned = Int((mainCenter - Double(target.extent(axis)) / 2).rounded())
    }
    switch axis {
    case .vertical: return CGPoint(x: target.x, y: aligned)
    case .horizontal: return CGPoint(x: aligned, y: target.y)
    }
}
