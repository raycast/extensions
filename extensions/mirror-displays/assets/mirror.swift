import Cocoa
import CoreGraphics

func getDisplays() -> [CGDirectDisplayID] {
    var displayCount: UInt32 = 0
    var activeCount: UInt32 = 0
    CGGetOnlineDisplayList(0, nil, &displayCount)
    var displays = [CGDirectDisplayID](repeating: 0, count: Int(displayCount))
    CGGetOnlineDisplayList(displayCount, &displays, &activeCount)
    return Array(displays.prefix(Int(activeCount)))
}

let args = CommandLine.arguments
if args.count < 2 {
    print("Usage: swift mirror.swift [mac|external|off]")
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
    print("Could not find the internal Mac display.")
    exit(1)
}

if extDisplays.isEmpty {
    print("No external displays detected.")
    exit(2)
}

let mode = args[1]

var config: CGDisplayConfigRef?
CGBeginDisplayConfiguration(&config)

if mode == "mac" {
    // External mirrors Mac.
    for ext in extDisplays {
        CGConfigureDisplayMirrorOfDisplay(config, ext, mac)
    }
} else if mode == "external" {
    // Mac mirrors the first External.
    let primaryExt = extDisplays[0]
    CGConfigureDisplayMirrorOfDisplay(config, mac, primaryExt)
    // Other externals also mirror the first external
    for ext in extDisplays.dropFirst() {
        CGConfigureDisplayMirrorOfDisplay(config, ext, primaryExt)
    }
} else if mode == "off" {
    // Turn off mirroring
    CGConfigureDisplayMirrorOfDisplay(config, mac, kCGNullDirectDisplay)
    for ext in extDisplays {
        CGConfigureDisplayMirrorOfDisplay(config, ext, kCGNullDirectDisplay)
    }
} else {
    print("Unknown mode")
    exit(1)
}

let result = CGCompleteDisplayConfiguration(config, .forSession)
// exit with code corresponding to success
if result == .success {
    exit(0)
} else {
    exit(1)
}
