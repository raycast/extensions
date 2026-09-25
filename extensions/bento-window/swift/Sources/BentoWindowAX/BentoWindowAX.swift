// 免 Pro 的窗口后端：枚举走 CGWindowList（无需权限），读写走 AXUIElement 直调
// （需要给 Raycast 授「辅助功能」权限；本进程由 Raycast 拉起，授权归属 Raycast）。
// 刻意不读 CG 窗口标题——那需要屏幕录制权限；窗口匹配只用 pid + 当前坐标。
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
  let id: String  // kCGWindowNumber，窗口存活期间稳定，创建顺序单调递增
  let pid: Int
  let appName: String
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct Screen: Encodable {
  let id: String
  let frame: Rect  // 整屏，CG 左上角原点坐标系
  let visible: Rect  // 去掉菜单栏和 Dock 的可用区域
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
  // OnScreenOnly：只取当前 Space 可见窗口（layer 过滤自然排除桌面元素）
  let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
  var windows: [Window] = []
  var menubars: [Rect] = []  // layer 24 = 菜单栏，每块屏一条，用于修正 visibleFrame
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
    // Cocoa 左下原点 → CG 左上原点
    let frame = Rect(x: f.minX, y: h0 - f.maxY, width: f.width, height: f.height)
    var visible = Rect(x: v.minX, y: h0 - v.maxY, width: v.width, height: v.height)
    // macOS 26 对外接屏上报的 visibleFrame 不扣菜单栏，用实测的菜单栏窗口高度修正
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
  // 鼠标位置用来判断用户在哪块屏。CG 列表首个窗口做不到这件事：多屏独立
  // Spaces 下它按 Space 分组，不是全局 z-order
  let m = NSEvent.mouseLocation
  return State(windows: windows, screens: screens, cursor: Point(x: m.x, y: h0 - m.y))
}

// MARK: - AX 读写

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
  // 当前坐标，用于在 AX 窗口列表里定位目标窗口
  let cx: Double
  let cy: Double
  let cw: Double
  let ch: Double
  // 目标坐标
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
  // 对应官方 WindowManagement API 的 positionable && resizable：
  // AXSize 与 AXPosition 都可设置才算可平铺
  let eligible: Bool
}

// 进程一律按 pid 取 AX 应用元素，不经过进程名或进程序号，
// 同名多进程（如两个 Ghostty 实例）各自独立。
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

// CG 窗口与 AX 窗口是两套互不相通的列表，只能靠 pid + 四维坐标对上。
// 探测和移动用同一套匹配规则，避免「探测认可的窗口移动时却对不上」。
// 匹配用「最近优先」而不是「第一个落在容差内」：macOS 新窗口 cascade 偏移约
// 20px，小于容差 40，逐个取首个命中会让层叠的同 app 窗口互相错配、交换槽位。
// 先枚举全部候选对，按四维距离全局升序锁定，层叠时也能对上。
// 不可平铺的 AX 窗口不参与配对：Electron 类 app 常带一个与主窗口坐标完全
// 相同的覆盖层窗口（飞书的 WatermarkWidget，AXSize 不可设），若让它进候选，
// 距离同为 0 时会先被选中，size 写上去被静默忽略，主窗口原地不动。
private let tolerance = 40.0

// 返回 group 下标 → ax 下标
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
  // 距离相同时按候选顺序取，与原 JS 稳定排序一致（Swift 的 sort 不保证稳定）
  pairs.sort { ($0.dist, $0.g, $0.i) < ($1.dist, $1.g, $1.i) }
  var usedWindow = Set<Int>()
  var matched: [Int: Int] = [:]
  for pr in pairs where matched[pr.g] == nil && !usedWindow.contains(pr.i) {
    usedWindow.insert(pr.i)
    matched[pr.g] = pr.i
  }
  return matched
}

// 按 pid 分组，保持首次出现的顺序
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

// 可平铺性探测。CG 列表里混着改不了大小或位置的窗口——固定尺寸的工具窗、
// 对话框、面板、覆盖层——它们一旦进网格就会占掉一个槽位、随后设置失败，
// 网格缺一块。用 AXSize / AXPosition 的 settable 在布局计算之前挑出去。
@raycast func probeTileable(items: [ProbeItem]) -> ProbeResult {
  guard AXIsProcessTrusted() else { return ProbeResult(tileable: [], trusted: false) }
  var tileable: [String] = []
  for (pid, group) in groupByPid(items, { $0.pid }) {
    // 探测不到就当作不可平铺，移动阶段本来也会失败
    guard let ax = readWindows(AXUIElementCreateApplication(pid_t(pid))) else { continue }
    let matched = matchGroup(group.map { ($0.cx, $0.cy, $0.cw, $0.ch) }, ax)
    for g in matched.keys.sorted() { tileable.append(group[g].id) }
  }
  return ProbeResult(tileable: tileable, trusted: true)
}

@raycast func moveWindows(moves: [Move]) -> ApplyResult {
  guard AXIsProcessTrusted() else { return ApplyResult(failed: moves.map(\.id), trusted: false) }
  var failed: [String] = []
  // 第一阶段按进程分组读坐标、配对。第二阶段再按调用方给的槽位顺序逐个写入，
  // 网格从槽位 1 起一格格填满，而不是按 pid 顺序一个 app 一个 app 地跳。
  var targets: [String: AXUIElement] = [:]
  var enhanced: [AXUIElement] = []  // 本次临时关掉的 AXEnhancedUserInterface，写完恢复
  let enhancedAttr = "AXEnhancedUserInterface" as CFString
  for (pid, group) in groupByPid(moves, { $0.pid }) {
    let app = AXUIElementCreateApplication(pid_t(pid))
    // 可设置性在这里再读一遍而不是沿用探测结果：探测到移动之间窗口可能增减，
    // AX 顺序会漂，而探测阶段剔掉的覆盖层窗口仍会和主窗口一起出现在这份列表里
    guard let ax = readWindows(app) else {
      failed.append(contentsOf: group.map(\.id))
      continue
    }
    let matched = matchGroup(group.map { ($0.cx, $0.cy, $0.cw, $0.ch) }, ax)
    for (g, m) in group.enumerated() {
      if let i = matched[g] { targets[m.id] = ax[i].element } else { failed.append(m.id) }
    }
    // AXEnhancedUserInterface 一旦被某个辅助功能客户端打开，AppKit 就把这个
    // app 的窗口 frame 变化做成渐进动画：size 刚写下去还在动，紧接着的 position
    // 写入就叠在中间帧上，窗口最终停在离槽位几十像素的地方、尺寸也是个中间值。
    // Rectangle、yabai、Hammerspoon 的做法相同：移窗前临时关掉，移完恢复。
    // 写入结果码不可信：Ghostty、访达写这个属性时值已生效却返回 -25208
    // （kAXErrorNotImplemented），按返回码判断会关掉了却不恢复。只要原值为
    // true 就记下，恢复时同样不看返回码。
    var v: CFTypeRef?
    if AXUIElementCopyAttributeValue(app, enhancedAttr, &v) == .success, (v as? Bool) == true {
      AXUIElementSetAttributeValue(app, enhancedAttr, kCFBooleanFalse)
      enhanced.append(app)
    }
  }
  // 无论写入阶段怎么退出，关掉的 AXEnhancedUserInterface 都要恢复，
  // 不能让别家 app 留在关闭状态
  defer {
    for app in enhanced { AXUIElementSetAttributeValue(app, enhancedAttr, kCFBooleanTrue) }
  }
  for m in moves {
    guard let w = targets[m.id] else { continue }
    // 已经在目标位置的窗口不必再写：省一次往返，也省一次多余的重绘
    if m.x == m.cx && m.y == m.cy && m.width == m.cw && m.height == m.ch { continue }
    var size = CGSize(width: m.width, height: m.height)
    var pos = CGPoint(x: m.x, y: m.y)
    let sizeValue = AXValueCreate(.cgSize, &size)!
    let posValue = AXValueCreate(.cgPoint, &pos)!
    // 顺序必须是 size → position → size：先挪位置会让大窗悬出屏幕，
    // 随后的 resize 触发 AppKit 跨屏约束、高度被加上 ~57px（macOS 26 实测）。
    // 末尾那次 size 只有放大路径需要（贴底放大时首次 size 同样会被钳）
    var ok = AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, sizeValue) == .success
    ok = AXUIElementSetAttributeValue(w, kAXPositionAttribute as CFString, posValue) == .success && ok
    if m.width > m.cw || m.height > m.ch {
      ok = AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, sizeValue) == .success && ok
    }
    if !ok { failed.append(m.id) }
  }
  return ApplyResult(failed: failed, trusted: true)
}
