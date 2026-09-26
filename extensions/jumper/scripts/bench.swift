// End-to-end latency bench: triggers a command via deeplink and measures until the frontmost app changes.
// Build: swiftc -O -o /tmp/aff-bench scripts/bench.swift
// Run (with `npm run dev` active): /tmp/aff-bench back forward back forward
// Prints trigger epoch ms to stderr (compare with "PERF start" in the dev log to get dispatch latency).
import AppKit

for command in CommandLine.arguments.dropFirst() {
  let initial = NSWorkspace.shared.frontmostApplication?.bundleIdentifier
  let task = Process()
  task.executableURL = URL(fileURLWithPath: "/usr/bin/open")
  task.arguments = ["-g", "raycast://extensions/matt_herwig/jumper/\(command)"]
  let t0 = Date()
  FileHandle.standardError.write("T0 \(Int(t0.timeIntervalSince1970 * 1000))\n".data(using: .utf8)!)
  try! task.run()
  while Date().timeIntervalSince(t0) < 2 {
    RunLoop.current.run(until: Date().addingTimeInterval(0.005))
    if NSWorkspace.shared.frontmostApplication?.bundleIdentifier != initial { break }
  }
  let ms = Date().timeIntervalSince(t0) * 1000
  print(String(format: "%@ %.0fms -> %@", command, ms, NSWorkspace.shared.frontmostApplication?.bundleIdentifier ?? "?"))
  Thread.sleep(forTimeInterval: 1.2)
}
