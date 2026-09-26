// On-screen overlay for the demo GIF: keycaps + caption for each step, and a title card.
// Usage: swift keycast.swift <x> <y> <width> <height> <icon.png>   (recording area, points, top-left origin)
// Reads one JSON object per line on stdin:
//   {"keys": ["⌃", "⌥", "["], "title": "Back", "detail": "to the previous app"}   keycaps HUD at the bottom
//   {"card": "Jumper", "sub": "Back and Forward for your Mac apps"}               full-frame title card
//   {}                                                                            hide everything
// EOF quits. Runs as an accessory app so it never takes focus (that would change the app history
// being demoed).
import AppKit

struct Message: Decodable {
  var keys: [String]?
  var title: String?
  var detail: String?
  var card: String?
  var sub: String?
}

let a = CommandLine.arguments.dropFirst().prefix(4).compactMap { Double($0) }
let icon = NSImage(contentsOfFile: CommandLine.arguments[5])
let screenHeight = NSScreen.screens[0].frame.height
// Recording area in AppKit coordinates (bottom-left origin).
let area = NSRect(x: a[0], y: screenHeight - a[1] - a[3], width: a[2], height: a[3])

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

func makePanel() -> NSPanel {
  let p = NSPanel(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
  p.level = .screenSaver
  p.isOpaque = false
  p.backgroundColor = .clear
  p.ignoresMouseEvents = true
  p.hasShadow = true
  p.collectionBehavior = [.canJoinAllSpaces, .stationary]
  return p
}

func background(radius: CGFloat) -> NSView {
  let v = NSView()
  v.wantsLayer = true
  v.layer?.backgroundColor = NSColor(srgbRed: 0.09, green: 0.07, blue: 0.14, alpha: 0.97).cgColor
  v.layer?.cornerRadius = radius
  v.layer?.borderWidth = 1
  v.layer?.borderColor = NSColor(white: 1, alpha: 0.12).cgColor
  return v
}

func text(_ s: String, size: CGFloat, weight: NSFont.Weight, alpha: CGFloat = 1) -> NSTextField {
  let t = NSTextField(labelWithString: s)
  t.font = .systemFont(ofSize: size, weight: weight)
  t.textColor = NSColor(white: 1, alpha: alpha)
  return t
}

func keycap(_ key: String) -> NSView {
  let cap = NSView()
  cap.wantsLayer = true
  cap.layer?.backgroundColor = NSColor(white: 1, alpha: 0.14).cgColor
  cap.layer?.cornerRadius = 8
  cap.layer?.borderWidth = 1
  cap.layer?.borderColor = NSColor(white: 1, alpha: 0.25).cgColor
  let label = text(key, size: 22, weight: .semibold)
  label.alignment = .center
  label.translatesAutoresizingMaskIntoConstraints = false
  cap.addSubview(label)
  cap.translatesAutoresizingMaskIntoConstraints = false
  NSLayoutConstraint.activate([
    cap.heightAnchor.constraint(equalToConstant: 42),
    cap.widthAnchor.constraint(greaterThanOrEqualToConstant: 42),
    label.centerYAnchor.constraint(equalTo: cap.centerYAnchor),
    label.leadingAnchor.constraint(equalTo: cap.leadingAnchor, constant: 12),
    label.trailingAnchor.constraint(equalTo: cap.trailingAnchor, constant: -12),
  ])
  return cap
}

/// Lays out `content` inside a rounded background and sizes `panel` to fit, positioned by `place`.
func show(_ panel: NSPanel, _ content: NSView, radius: CGFloat, padding: NSEdgeInsets, place: (NSSize) -> NSPoint) {
  let bg = background(radius: radius)
  content.translatesAutoresizingMaskIntoConstraints = false
  bg.addSubview(content)
  NSLayoutConstraint.activate([
    content.topAnchor.constraint(equalTo: bg.topAnchor, constant: padding.top),
    content.bottomAnchor.constraint(equalTo: bg.bottomAnchor, constant: -padding.bottom),
    content.leadingAnchor.constraint(equalTo: bg.leadingAnchor, constant: padding.left),
    content.trailingAnchor.constraint(equalTo: bg.trailingAnchor, constant: -padding.right),
  ])
  panel.contentView = bg
  let size = bg.fittingSize
  panel.setFrame(NSRect(origin: place(size), size: size), display: true)
  panel.orderFrontRegardless()
}

let hud = makePanel()
let card = makePanel()

func handle(_ m: Message) {
  if let keys = m.keys {
    let caps = NSStackView(views: keys.map(keycap))
    caps.spacing = 6
    let words = NSStackView(views: [text(m.title ?? "", size: 22, weight: .semibold)])
    words.orientation = .vertical
    words.alignment = .leading
    words.spacing = 2
    if let d = m.detail { words.addArrangedSubview(text(d, size: 15, weight: .regular, alpha: 0.65)) }
    let row = NSStackView(views: [caps, words])
    row.spacing = 18
    row.alignment = .centerY
    show(hud, row, radius: 16, padding: NSEdgeInsets(top: 14, left: 16, bottom: 14, right: 22)) { size in
      NSPoint(x: area.midX - size.width / 2, y: area.minY + 28)
    }
  } else {
    hud.orderOut(nil)
  }
  if let title = m.card {
    showCard(title, m.sub)
  } else {
    card.orderOut(nil)
  }
}

/// Full-frame card over the whole recording area: the purple gradient from the Store screenshots
/// (compose.swift), the extension icon, title, and subtitle.
func showCard(_ title: String, _ sub: String?) {
  let view = NSView()
  view.wantsLayer = true
  let gradient = CAGradientLayer()
  gradient.colors = [
    NSColor(srgbRed: 0.18, green: 0.09, blue: 0.40, alpha: 1).cgColor,
    NSColor(srgbRed: 0.42, green: 0.25, blue: 0.78, alpha: 1).cgColor,
    NSColor(srgbRed: 0.80, green: 0.52, blue: 0.93, alpha: 1).cgColor,
  ]
  gradient.startPoint = CGPoint(x: 0, y: 1)
  gradient.endPoint = CGPoint(x: 1, y: 0)
  gradient.frame = NSRect(origin: .zero, size: area.size)
  view.layer = gradient

  var views: [NSView] = []
  if let icon {
    let image = NSImageView(image: icon)
    image.translatesAutoresizingMaskIntoConstraints = false
    image.widthAnchor.constraint(equalToConstant: 128).isActive = true
    image.heightAnchor.constraint(equalToConstant: 128).isActive = true
    views.append(image)
  }
  views.append(text(title, size: 60, weight: .bold))
  if let sub { views.append(text(sub, size: 26, weight: .medium, alpha: 0.85)) }
  let stack = NSStackView(views: views)
  stack.orientation = .vertical
  stack.spacing = 14
  stack.setCustomSpacing(22, after: views[0])
  stack.translatesAutoresizingMaskIntoConstraints = false
  view.addSubview(stack)
  NSLayoutConstraint.activate([
    stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
    stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
  ])
  card.hasShadow = false
  card.contentView = view
  card.setFrame(area, display: true)
  card.orderFrontRegardless()
}

var buffer = Data()
FileHandle.standardInput.readabilityHandler = { h in
  let data = h.availableData
  guard !data.isEmpty else { return DispatchQueue.main.async { app.terminate(nil) } }
  buffer.append(data)
  while let nl = buffer.firstIndex(of: 0x0A) {
    let line = buffer[buffer.startIndex..<nl]
    buffer = Data(buffer[buffer.index(after: nl)...])
    if let m = try? JSONDecoder().decode(Message.self, from: line) { DispatchQueue.main.async { handle(m) } }
  }
}

app.run()
