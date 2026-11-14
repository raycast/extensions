// Pro-free window backend: enumeration via CGWindowList (no permission), read/write via direct AXUIElement
// (Raycast needs Accessibility permission; Raycast launches this process, so the grant applies to Raycast).
// Deliberately does not read CG window titles — that requires Screen Recording; matching uses pid + current bounds only.
import AppKit
import ApplicationServices
import RaycastSwiftMacros

struct Rect: Codable {
  var x: Double
  var y: Double
  var width: Double
  var height: Double
}

struct Window: Encodable {
  let id: String  // kCGWindowNumber; stable while the window lives; creation order is monotonic
  let pid: Int
  let appName: String
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct Screen: Encodable {
  let id: String
  let frame: Rect  // full screen, CG top-left origin
  let visible: Rect  // usable area excluding menu bar and Dock
}

struct Point: Encodable {
  let x: Double
  let y: Double
}

struct State: Encodable {
  let windows: [Window]
  let screens: [Screen]
  let cursor: Point
}

@raycast func listState() -> State {
  // OnScreenOnly: windows visible on the current Space (layer filtering excludes desktop chrome)
  let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
  var windows: [Window] = []
  var menubars: [Rect] = []  // layer 24 = menu bar, one per display, used to fix visibleFrame
  for d in list {
    guard let bd = d[kCGWindowBounds as String] as? NSDictionary,
      let b = CGRect(dictionaryRepresentation: bd)
    else { continue }
    let layer = d[kCGWindowLayer as String] as? Int ?? -1
    if layer == 24 && b.width >= 800 && b.height <= 60 {
      menubars.append(Rect(x: b.minX, y: b.minY, width: b.width, height: b.height))
      continue
    }
    if layer != 0 { continue }
    if (d[kCGWindowAlpha as String] as? Double) == 0 { continue }
    if b.width < 100 || b.height < 50 { continue }
    windows.append(
      Window(
        id: String(d[kCGWindowNumber as String] as? Int ?? 0),
        pid: d[kCGWindowOwnerPID as String] as? Int ?? 0,
        appName: d[kCGWindowOwnerName as String] as? String ?? "",
        x: b.minX, y: b.minY, width: b.width, height: b.height))
  }
  var screens: [Screen] = []
  let all = NSScreen.screens
  let h0 = all.first?.frame.height ?? 0
  for (i, s) in all.enumerated() {
    let f = s.frame
    let v = s.visibleFrame
    // Cocoa bottom-left origin → CG top-left origin
    let frame = Rect(x: f.minX, y: h0 - f.maxY, width: f.width, height: f.height)
    var visible = Rect(x: v.minX, y: h0 - v.maxY, width: v.width, height: v.height)
    // macOS 26: external displays may report visibleFrame without subtracting the menu bar; correct using measured menu bar height
    if let bar = menubars.first(where: { abs($0.x - frame.x) <= 2 && abs($0.y - frame.y) <= 2 }) {
      let reported = visible.y - frame.y
      if reported < bar.height {
        let diff = bar.height - reported
        visible.y += diff
        visible.height -= diff
      }
    }
    screens.append(Screen(id: String(i), frame: frame, visible: visible))
  }
  // Pointer position decides which display is active. The CG list cannot: with per-display Spaces
  // it is grouped by Space, not global z-order
  let m = NSEvent.mouseLocation
  return State(windows: windows, screens: screens, cursor: Point(x: m.x, y: h0 - m.y))
}

// MARK: - AX read/write

struct ProbeItem: Decodable {
  let id: String
  let pid: Int
  let cx: Double
  let cy: Double
  let cw: Double
  let ch: Double
}

struct Move: Decodable {
  let id: String
  let pid: Int
  // current bounds, used to locate the window in the AX window list
  let cx: Double
  let cy: Double
  let cw: Double
  let ch: Double
  // target bounds
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct ProbeResult: Encodable {
  let tileable: [String]
  let trusted: Bool
}

struct ApplyResult: Encodable {
  let failed: [String]
  let trusted: Bool
}

private struct AXWindow {
  let element: AXUIElement
  let frame: CGRect
  // Matches official WindowManagement API positionable && resizable:
  // both AXSize and AXPosition must be settable to tile
  let eligible: Bool
}

// Always resolve the AX application element by pid, never by name or process index —
// multiple processes with the same name (e.g. two Ghostty instances) stay independent.
private func readWindows(_ app: AXUIElement) -> [AXWindow]? {
  var raw: CFTypeRef?
  guard AXUIElementCopyAttributeValue(app, kAXWindowsAttribute as CFString, &raw) == .success,
    let elements = raw as? [AXUIElement]
  else { return nil }
  return elements.map { w in
    var values: CFArray?
    var p = CGPoint.zero
    var s = CGSize.zero
    let attrs = [kAXPositionAttribute, kAXSizeAttribute] as CFArray
    if AXUIElementCopyMultipleAttributeValues(w, attrs, [], &values) == .success,
      let vs = values as? [AnyObject], vs.count == 2
    {
      if CFGetTypeID(vs[0]) == AXValueGetTypeID() { AXValueGetValue(vs[0] as! AXValue, .cgPoint, &p) }
      if CFGetTypeID(vs[1]) == AXValueGetTypeID() { AXValueGetValue(vs[1] as! AXValue, .cgSize, &s) }
    }
    return AXWindow(element: w, frame: CGRect(origin: p, size: s), eligible: settable(w, kAXSizeAttribute) && settable(w, kAXPositionAttribute))
  }
}

private func settable(_ el: AXUIElement, _ attr: String) -> Bool {
  var ok = DarwinBoolean(false)
  return AXUIElementIsAttributeSettable(el, attr as CFString, &ok) == .success && ok.boolValue
}

// CG windows and AX windows are disjoint lists; pairing is pid + four-dimensional bounds only.
// Probe and move share the same rules so a window accepted at probe time still matches at move time.
// Prefer nearest match, not first within tolerance: macOS cascades new windows by ~20px, under our
// 40px tolerance, so first-hit pairing swaps stacked windows of the same app.
// Enumerate all candidate pairs, lock globally by ascending 4D distance so cascades still pair correctly.
// Ineligible AX windows skip pairing: Electron apps often have an overlay with the same bounds as the
// main window (e.g. Lark/Feishu WatermarkWidget, non-settable AXSize). If it enters the pool with
// distance 0, it wins, size writes are ignored, and the main window never moves.
private let tolerance = 40.0

// Returns group index → ax index
private func matchGroup(_ group: [(cx: Double, cy: Double, cw: Double, ch: Double)], _ ax: [AXWindow]) -> [Int: Int] {
  var pairs: [(g: Int, i: Int, dist: Double)] = []
  for (g, m) in group.enumerated() {
    for (i, w) in ax.enumerated() where w.eligible {
      let dx = w.frame.minX - m.cx
      let dy = w.frame.minY - m.cy
      let dw = w.frame.width - m.cw
      let dh = w.frame.height - m.ch
      if abs(dx) <= tolerance && abs(dy) <= tolerance && abs(dw) <= tolerance && abs(dh) <= tolerance {
        pairs.append((g, i, dx * dx + dy * dy + dw * dw + dh * dh))
      }
    }
  }
  // Tie-break by candidate order to mirror stable JS ordering (Swift sort is not stable)
  pairs.sort { ($0.dist, $0.g, $0.i) < ($1.dist, $1.g, $1.i) }
  var usedWindow = Set<Int>()
  var matched: [Int: Int] = [:]
  for pr in pairs where matched[pr.g] == nil && !usedWindow.contains(pr.i) {
    usedWindow.insert(pr.i)
    matched[pr.g] = pr.i
  }
  return matched
}

// Group by pid, preserving first-seen order
private func groupByPid<T>(_ items: [T], _ pid: (T) -> Int) -> [(pid: Int, items: [T])] {
  var order: [Int] = []
  var map: [Int: [T]] = [:]
  for it in items {
    let p = pid(it)
    if map[p] == nil { order.append(p) }
    map[p, default: []].append(it)
  }
  return order.map { ($0, map[$0]!) }
}

// Tileability probe. The CG list mixes fixed-size utility windows, dialogs, panels, and overlays —
// they would take a grid slot then fail to resize, leaving a hole. Filter by AXSize/AXPosition
// settable before layout.
@raycast func probeTileable(items: [ProbeItem]) -> ProbeResult {
  guard AXIsProcessTrusted() else { return ProbeResult(tileable: [], trusted: false) }
  var tileable: [String] = []
  for (pid, group) in groupByPid(items, { $0.pid }) {
    // Unreadable AX tree → treat as not tileable; move would fail anyway
    guard let ax = readWindows(AXUIElementCreateApplication(pid_t(pid))) else { continue }
    let matched = matchGroup(group.map { ($0.cx, $0.cy, $0.cw, $0.ch) }, ax)
    for g in matched.keys.sorted() { tileable.append(group[g].id) }
  }
  return ProbeResult(tileable: tileable, trusted: true)
}

@raycast func moveWindows(moves: [Move]) -> ApplyResult {
  guard AXIsProcessTrusted() else { return ApplyResult(failed: moves.map(\.id), trusted: false) }
  var failed: [String] = []
  // Phase 1: group by process, read bounds, pair. Phase 2: write in caller slot order so the grid
  // fills slot 1 onward, not one app at a time by pid.
  var targets: [String: AXUIElement] = [:]
  var enhanced: [AXUIElement] = []  // AXEnhancedUserInterface temporarily disabled for this move, restored after
  let enhancedAttr = "AXEnhancedUserInterface" as CFString
  for (pid, group) in groupByPid(moves, { $0.pid }) {
    let app = AXUIElementCreateApplication(pid_t(pid))
    // Re-read settable here instead of reusing probe results: windows may appear/disappear between
    // probe and move, AX order drifts, and overlay windows filtered at probe still sit beside the main window
    guard let ax = readWindows(app) else {
      failed.append(contentsOf: group.map(\.id))
      continue
    }
    let matched = matchGroup(group.map { ($0.cx, $0.cy, $0.cw, $0.ch) }, ax)
    for (g, m) in group.enumerated() {
      if let i = matched[g] { targets[m.id] = ax[i].element } else { failed.append(m.id) }
    }
    // When AXEnhancedUserInterface is on, AppKit animates frame changes: size is still moving when
    // position is written, so the window lands tens of pixels short at an intermediate size.
    // Same approach as Rectangle, yabai, Hammerspoon: disable for the move, restore after.
    // Write result is unreliable: Ghostty and Finder apply the change but return -25208
    // (kAXErrorNotImplemented); trusting the code would skip restore. Record when the original value
    // was true and restore regardless of return code.
    var v: CFTypeRef?
    if AXUIElementCopyAttributeValue(app, enhancedAttr, &v) == .success, (v as? Bool) == true {
      AXUIElementSetAttributeValue(app, enhancedAttr, kCFBooleanFalse)
      enhanced.append(app)
    }
  }
  // Always restore AXEnhancedUserInterface we turned off, however the write phase exits
  defer {
    for app in enhanced { AXUIElementSetAttributeValue(app, enhancedAttr, kCFBooleanTrue) }
  }
  for m in moves {
    guard let w = targets[m.id] else { continue }
    // Skip windows already at the target bounds: saves a round trip and an extra redraw
    if m.x == m.cx && m.y == m.cy && m.width == m.cw && m.height == m.ch { continue }
    var size = CGSize(width: m.width, height: m.height)
    var pos = CGPoint(x: m.x, y: m.y)
    let sizeValue = AXValueCreate(.cgSize, &size)!
    let posValue = AXValueCreate(.cgPoint, &pos)!
    // Order must be size → position → size: moving first leaves a large window off-screen;
    // the following resize hits AppKit cross-display constraints (~+57px height on macOS 26).
    // Final size pass only when growing (bottom-grow paths need it; first size is clamped too)
    var ok = AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, sizeValue) == .success
    ok = AXUIElementSetAttributeValue(w, kAXPositionAttribute as CFString, posValue) == .success && ok
    if m.width > m.cw || m.height > m.ch {
      ok = AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, sizeValue) == .success && ok
    }
    if !ok { failed.append(m.id) }
  }
  return ApplyResult(failed: failed, trusted: true)
}
