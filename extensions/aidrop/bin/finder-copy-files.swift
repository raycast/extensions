import AppKit
import Foundation

let rawPaths = Array(CommandLine.arguments.dropFirst())

guard !rawPaths.isEmpty else {
  fputs("No file paths provided\n", stderr)
  exit(1)
}

let urls: [NSURL] = rawPaths.map {
  let expanded = ($0 as NSString).expandingTildeInPath
  return NSURL(fileURLWithPath: expanded)
}

let pasteboard = NSPasteboard.general
pasteboard.clearContents()

var success = pasteboard.writeObjects(urls)

// Legacy compatibility for apps that still read old filename payloads.
let paths = urls.compactMap { $0.path }
success = pasteboard.setPropertyList(paths, forType: NSPasteboard.PasteboardType("NSFilenamesPboardType")) && success

if !success {
  fputs("Failed to write file URLs to pasteboard\n", stderr)
  exit(1)
}
