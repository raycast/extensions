import Cocoa
import CoreGraphics

func getDisplays() -> [CGDirectDisplayID] {
    var displayCount: UInt32 = 0
    var activeCount: UInt32 = 0
    var err = CGGetOnlineDisplayList(0, nil, &displayCount)
    if err != .success {
        fputs("Failed to get display count: \(err)\n", stderr)
        exit(1)
    }
    var displays = [CGDirectDisplayID](repeating: 0, count: Int(displayCount))
    err = CGGetOnlineDisplayList(displayCount, &displays, &activeCount)
    if err != .success {
        fputs("Failed to get displays: \(err)\n", stderr)
        exit(1)
    }
    return Array(displays.prefix(Int(activeCount)))
}

let args = CommandLine.arguments
if args.count < 2 {
    fputs("Usage: swift mirror.swift [mac|external|off]\n", stderr)
    exit(1)
}

let displays = getDisplays()

func isBuiltIn(_ display: CGDirectDisplayID) -> Bool {
    return CGDisplayIsBuiltin(display) != 0
}

var macDisplay: CGDirectDisplayID?
var extDisplays: [CGDirectDisplayID] = []

for d in displays {
    if isBuiltIn(d) {
        macDisplay = d
    } else {
        extDisplays.append(d)
    }
}

guard let mac = macDisplay else {
    fputs("Could not find the internal Mac display.\n", stderr)
    exit(1)
}

if extDisplays.isEmpty {
    fputs("No external displays detected.\n", stderr)
    exit(2)
}

let mode = args[1]

var config: CGDisplayConfigRef?
let beginResult = CGBeginDisplayConfiguration(&config)
if beginResult != .success {
    fputs("Failed to begin display configuration: \(beginResult)\n", stderr)
    exit(1)
}

var failed = false

func configureMirror(_ display: CGDirectDisplayID, _ master: CGDirectDisplayID) {
    if CGConfigureDisplayMirrorOfDisplay(config, display, master) != .success {
        fputs("Failed to configure mirror for display \(display) -> \(master)\n", stderr)
        failed = true
    }
}

if mode == "mac" {
    // External mirrors Mac.
    for ext in extDisplays {
        configureMirror(ext, mac)
    }
} else if mode == "external" {
    // Mac mirrors the first External.
    let primaryExt = extDisplays[0]
    configureMirror(mac, primaryExt)
    // Other externals also mirror the first external
    for ext in extDisplays.dropFirst() {
        configureMirror(ext, primaryExt)
    }
} else if mode == "off" {
    // Turn off mirroring
    configureMirror(mac, kCGNullDirectDisplay)
    for ext in extDisplays {
        configureMirror(ext, kCGNullDirectDisplay)
    }
} else {
    fputs("Unknown mode\n", stderr)
    CGCancelDisplayConfiguration(config)
    exit(1)
}

if failed {
    CGCancelDisplayConfiguration(config)
    exit(1)
}

let result = CGCompleteDisplayConfiguration(config, .forSession)
// exit with code corresponding to success
if result == .success {
    exit(0)
} else {
    fputs("Failed to complete configuration: \(result)\n", stderr)
    exit(1)
}
