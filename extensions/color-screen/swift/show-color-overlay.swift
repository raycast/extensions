import AppKit
import QuartzCore

// 全屏颜色覆盖窗口
final class OverlayWindow: NSWindow {
  init(screen: NSScreen, color: NSColor) {
    super.init(
      contentRect: screen.frame,
      styleMask: .borderless,
      backing: .buffered,
      defer: false
    )
    isOpaque = false
    level = .mainMenu + 2
    backgroundColor = color
    ignoresMouseEvents = false
    acceptsMouseMovedEvents = true
    collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
  }

  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { true }

  // 点击鼠标退出
  override func mouseDown(with event: NSEvent) {
    NSApp.terminate(nil)
  }

  // 按 ESC 键退出
  override func keyDown(with event: NSEvent) {
    if event.keyCode == 53 {
      NSApp.terminate(nil)
    }
  }
}

// HEX 字符串转 NSColor
extension NSColor {
  convenience init?(hex: String) {
    var filtered = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if filtered.hasPrefix("#") {
      filtered.removeFirst()
    }

    // 支持 3 位和 4 位简写格式
    if filtered.count == 3 || filtered.count == 4 {
      filtered = filtered.map { String([$0, $0]) }.joined()
    }

    guard filtered.count == 6 || filtered.count == 8 else { return nil }

    var rgbaValue: UInt64 = 0
    guard Scanner(string: filtered).scanHexInt64(&rgbaValue) else { return nil }

    let hasAlpha = filtered.count == 8
    
    if hasAlpha {
      let r = CGFloat((rgbaValue & 0xFF000000) >> 24) / 255.0
      let g = CGFloat((rgbaValue & 0x00FF0000) >> 16) / 255.0
      let b = CGFloat((rgbaValue & 0x0000FF00) >> 8) / 255.0
      let a = CGFloat(rgbaValue & 0x000000FF) / 255.0
      self.init(red: r, green: g, blue: b, alpha: a)
    } else {
      let r = CGFloat((rgbaValue & 0xFF0000) >> 16) / 255.0
      let g = CGFloat((rgbaValue & 0x00FF00) >> 8) / 255.0
      let b = CGFloat(rgbaValue & 0x0000FF) / 255.0
      self.init(red: r, green: g, blue: b, alpha: 1.0)
    }
  }
}

// 主函数 - 从命令行参数读取颜色并显示
guard CommandLine.arguments.count >= 2 else {
  fatalError("Missing HEX color argument")
}

let hex1 = CommandLine.arguments[1]
let hex2 = CommandLine.arguments.count >= 3 ? CommandLine.arguments[2] : nil

guard let color1 = NSColor(hex: hex1) else {
  fatalError("Invalid HEX color")
}

var color2: NSColor?
if let hex2 = hex2, !hex2.isEmpty {
  guard let parsed = NSColor(hex: hex2) else {
    fatalError("Invalid HEX color 2")
  }
  color2 = parsed
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)

let targetScreen = NSScreen.screens.first { screen in
  screen.frame.contains(NSEvent.mouseLocation)
} ?? NSScreen.main!

let window = OverlayWindow(screen: targetScreen, color: color1)
let contentView = NSView(frame: targetScreen.frame)
contentView.wantsLayer = true

if let color2 = color2 {
  let gradientLayer = CAGradientLayer()
  gradientLayer.frame = contentView.bounds
  gradientLayer.colors = [color1.cgColor, color2.cgColor]
  gradientLayer.startPoint = CGPoint(x: 0, y: 0.5)
  gradientLayer.endPoint = CGPoint(x: 1, y: 0.5)
  contentView.layer?.addSublayer(gradientLayer)
} else {
  contentView.layer?.backgroundColor = color1.cgColor
}

window.contentView = contentView
window.makeKeyAndOrderFront(nil)
window.makeFirstResponder(contentView)

app.activate(ignoringOtherApps: true)
app.run()
