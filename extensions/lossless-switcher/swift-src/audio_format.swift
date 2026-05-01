// audio_format
//
// CLI helper that lists / sets / reads the physical format of macOS's
// default audio output device via the CoreAudio HAL. Used by:
//   - Alfred `audio` keyword Script Filter (./audio_format list)
//   - Alfred `audio` Run Script action     (./audio_format set "<rate> <bits> <int|float>")
//   - Menubar app's auto-follow apply path (in-process via the same
//     CoreAudio calls; binary form here is for the Alfred workflow).

import CoreAudio
import Foundation

let kMain = AudioObjectPropertyElement(kAudioObjectPropertyElementMain)
let kSystem = AudioObjectID(kAudioObjectSystemObject)

func die(_ msg: String, _ code: Int32 = 1) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(code)
}

func defaultOutputDevice() -> AudioDeviceID {
    var id: AudioDeviceID = 0
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain)
    let s = AudioObjectGetPropertyData(kSystem, &addr, 0, nil, &size, &id)
    if s != noErr || id == 0 { die("No default output device (err \(s))") }
    return id
}

func deviceName(_ device: AudioDeviceID) -> String {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioObjectPropertyName,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain)
    var name: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<CFString?>.size)
    let s = AudioObjectGetPropertyData(device, &addr, 0, nil, &size, &name)
    if s != noErr { return "Unknown" }
    return name?.takeRetainedValue() as String? ?? "Unknown"
}

func outputStreams(_ device: AudioDeviceID) -> [AudioStreamID] {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyStreams,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kMain)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(device, &addr, 0, nil, &size) == noErr else { return [] }
    var streams = [AudioStreamID](
        repeating: 0, count: Int(size) / MemoryLayout<AudioStreamID>.size)
    return AudioObjectGetPropertyData(device, &addr, 0, nil, &size, &streams) == noErr
        ? streams : []
}

func availableFormats(_ stream: AudioStreamID) -> [AudioStreamRangedDescription] {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioStreamPropertyAvailablePhysicalFormats,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(stream, &addr, 0, nil, &size) == noErr else { return [] }
    var ranges = [AudioStreamRangedDescription](
        repeating: AudioStreamRangedDescription(),
        count: Int(size) / MemoryLayout<AudioStreamRangedDescription>.size)
    guard AudioObjectGetPropertyData(stream, &addr, 0, nil, &size, &ranges) == noErr
    else { return [] }
    return ranges
}

func currentPhysicalFormat(_ stream: AudioStreamID) -> AudioStreamBasicDescription? {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioStreamPropertyPhysicalFormat,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain)
    var fmt = AudioStreamBasicDescription()
    var size = UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
    return AudioObjectGetPropertyData(stream, &addr, 0, nil, &size, &fmt) == noErr ? fmt : nil
}

func setPhysicalFormat(_ stream: AudioStreamID, _ fmt: AudioStreamBasicDescription) -> OSStatus {
    var f = fmt
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioStreamPropertyPhysicalFormat,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain)
    return AudioObjectSetPropertyData(
        stream, &addr, 0, nil,
        UInt32(MemoryLayout<AudioStreamBasicDescription>.size), &f)
}

struct FormatKey: Hashable {
    let rate: Int
    let bits: UInt32
    let isFloat: Bool
}

func formatKey(_ f: AudioStreamBasicDescription) -> FormatKey {
    FormatKey(
        rate: Int(f.mSampleRate.rounded()),
        bits: f.mBitsPerChannel,
        isFloat: (f.mFormatFlags & kAudioFormatFlagIsFloat) != 0)
}

func humanRate(_ hz: Int) -> String {
    let khz = Double(hz) / 1000.0
    return khz == khz.rounded() ? "\(Int(khz)) kHz" : String(format: "%.1f kHz", khz)
}

func formatLabel(_ k: FormatKey) -> String {
    let kind = k.isFloat ? "Float" : "Integer"
    return "\(k.bits)-bit \(kind) · \(humanRate(k.rate))"
}

let args = CommandLine.arguments
let cmd = args.count >= 2 ? args[1] : "list"

let device = defaultOutputDevice()
let name = deviceName(device)
let streams = outputStreams(device)
guard let firstStream = streams.first else { die("Device has no output stream") }

switch cmd {
case "list":
    let current = currentPhysicalFormat(firstStream).map(formatKey)
    var seen = Set<FormatKey>()
    var entries: [FormatKey] = []
    for stream in streams {
        for ranged in availableFormats(stream) {
            let k = formatKey(ranged.mFormat)
            if seen.insert(k).inserted { entries.append(k) }
        }
    }
    entries.sort {
        if $0.rate != $1.rate { return $0.rate < $1.rate }
        if $0.bits != $1.bits { return $0.bits < $1.bits }
        return !$0.isFloat && $1.isFloat
    }

    var items: [[String: Any]] = []
    for k in entries {
        let isCurrent = (k == current)
        let title = (isCurrent ? "✓ " : "") + formatLabel(k)
        let kind = k.isFloat ? "float" : "int"
        items.append([
            "uid": "\(k.rate)-\(k.bits)-\(kind)",
            "title": title,
            "subtitle": "Set \(name) to \(formatLabel(k))",
            "arg": "\(k.rate) \(k.bits) \(kind)",
            "autocomplete": formatLabel(k),
            "icon": ["path": "icon.png"],
        ])
    }
    if items.isEmpty {
        items.append([
            "title": "No formats available",
            "subtitle": "Device: \(name)",
            "valid": false,
        ])
    }
    let data = try JSONSerialization.data(withJSONObject: ["items": items], options: [])
    FileHandle.standardOutput.write(data)

case "set":
    // Accept argv-split (`set 48000 24 int`) or single-string
    // (`set "48000 24 int"`) — Alfred {query} substitution wraps the arg.
    let tail = Array(args.dropFirst(2))
    let parts: [String] = tail.count == 1
        ? tail[0].split(whereSeparator: { $0.isWhitespace }).map(String.init)
        : tail
    guard parts.count >= 3,
          let rate = Int(parts[0]),
          let bits = UInt32(parts[1])
    else { die("Usage: audio_format set <rate_hz> <bits> <int|float>") }
    let wantFloat = parts[2] == "float"

    var chosen: AudioStreamBasicDescription?
    for stream in streams {
        for ranged in availableFormats(stream) {
            let k = formatKey(ranged.mFormat)
            if k.rate == rate, k.bits == bits, k.isFloat == wantFloat {
                chosen = ranged.mFormat
                break
            }
        }
        if chosen != nil { break }
    }
    guard let fmt = chosen else { die("Format not supported by \(name)") }

    var successes = 0
    var lastErr: OSStatus = noErr
    for stream in streams {
        let s = setPhysicalFormat(stream, fmt)
        if s == noErr { successes += 1 } else { lastErr = s }
    }
    if successes == 0 { die("Failed to apply format (err \(lastErr))") }
    print("\(name) → \(formatLabel(formatKey(fmt)))")

case "current":
    if let f = currentPhysicalFormat(firstStream) {
        print("\(name): \(formatLabel(formatKey(f)))")
    } else {
        die("Could not read current format")
    }

default:
    die("Usage: audio_format [list|set <rate> <bits> <int|float>|current]")
}
