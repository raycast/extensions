// lossless-watcher
//
// Headless background daemon. Tails Music.app's MediaToolbox log stream,
// parses live audio format, writes to nowplaying.json, optionally
// auto-applies CoreAudio HAL physical format on track change.
//
// Lifecycle: launchd LaunchAgent (KeepAlive=true). No UI.

import CoreAudio
import Foundation

// MARK: - Paths -

let bundleID = "com.ariestwn.lossless-switcher"
let cacheDir =
    NSString(string: "~/Library/Caches/\(bundleID)").expandingTildeInPath
let supportDir =
    NSString(string: "~/Library/Application Support/\(bundleID)").expandingTildeInPath

let cachePath = "\(cacheDir)/nowplaying.json"
let applyLogPath = "\(cacheDir)/apply.log"
let menuBarHeartbeatPath = "\(cacheDir)/menu-bar.heartbeat"
let offSwitchPath = "\(supportDir)/autoapply.off"

// Stale threshold for the menu-bar heartbeat. Generous enough to cover users
// who configure long polling intervals (up to ~10 min); past this window we
// assume the menu-bar command is not activated and skip the refresh deeplink
// to avoid Raycast's "must be activated before it can be run in the
// background" error toast.
let menuBarHeartbeatStaleSeconds: TimeInterval = 600

func ensureDirs() {
    let fm = FileManager.default
    try? fm.createDirectory(atPath: cacheDir, withIntermediateDirectories: true)
    try? fm.createDirectory(atPath: supportDir, withIntermediateDirectories: true)
}

// MARK: - CoreAudio helpers (verbatim from Alfred app.swift) -

let kMain = AudioObjectPropertyElement(kAudioObjectPropertyElementMain)
let kSystem = AudioObjectID(kAudioObjectSystemObject)

struct DeviceFormat: Hashable {
    let rate: Int
    let bits: UInt32
    let isFloat: Bool
}

func formatKey(_ f: AudioStreamBasicDescription) -> DeviceFormat {
    DeviceFormat(
        rate: Int(f.mSampleRate.rounded()),
        bits: f.mBitsPerChannel,
        isFloat: (f.mFormatFlags & kAudioFormatFlagIsFloat) != 0
    )
}

func defaultOutputDevice() -> AudioDeviceID? {
    var id: AudioDeviceID = 0
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain
    )
    return AudioObjectGetPropertyData(kSystem, &addr, 0, nil, &size, &id) == noErr && id != 0
        ? id : nil
}

func outputStreams(_ d: AudioDeviceID) -> [AudioStreamID] {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyStreams,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kMain
    )
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(d, &addr, 0, nil, &size) == noErr else { return [] }
    var streams = [AudioStreamID](
        repeating: 0, count: Int(size) / MemoryLayout<AudioStreamID>.size
    )
    return AudioObjectGetPropertyData(d, &addr, 0, nil, &size, &streams) == noErr
        ? streams : []
}

func availableFormats(_ stream: AudioStreamID) -> [AudioStreamBasicDescription] {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioStreamPropertyAvailablePhysicalFormats,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain
    )
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(stream, &addr, 0, nil, &size) == noErr else { return [] }
    var ranges = [AudioStreamRangedDescription](
        repeating: AudioStreamRangedDescription(),
        count: Int(size) / MemoryLayout<AudioStreamRangedDescription>.size
    )
    guard AudioObjectGetPropertyData(stream, &addr, 0, nil, &size, &ranges) == noErr else { return [] }
    return ranges.map { $0.mFormat }
}

func setFormat(_ stream: AudioStreamID, _ fmt: AudioStreamBasicDescription) -> Bool {
    var f = fmt
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioStreamPropertyPhysicalFormat,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain
    )
    return AudioObjectSetPropertyData(
        stream, &addr, 0, nil,
        UInt32(MemoryLayout<AudioStreamBasicDescription>.size), &f
    ) == noErr
}

func applyAudioFormat(rate: Int, bits: UInt32) -> Bool {
    guard let device = defaultOutputDevice() else { return false }
    let streams = outputStreams(device)
    guard !streams.isEmpty else { return false }

    // Bit-depth fallback: requested → 24 → 32 → 16
    let depthOrder: [UInt32] = [bits, 24, 32, 16].reduce(into: []) { acc, x in
        if !acc.contains(x) { acc.append(x) }
    }

    for depth in depthOrder {
        for stream in streams {
            for fmt in availableFormats(stream) {
                let k = formatKey(fmt)
                if k.rate == rate, k.bits == depth, !k.isFloat {
                    var ok = true
                    for s in streams { ok = setFormat(s, fmt) && ok }
                    if ok { return true }
                }
            }
        }
    }
    return false
}

// MARK: - Log watcher -

final class LogWatcher {
    private var lastApplied = ""
    private var lastNotifiedKey = ""
    private var lastNotifiedAt: TimeInterval = 0
    private var buffer = ""
    private var task: Process?

    private let formatPat = #/\[AudioFormat ([a-zA-Z0-9]+)/#
    private let rendPat = #/\[Rendition ([^\]]+)\]/#
    private let ratePat = #/\[SampleRate (\d+)\]/#
    private let bitsPat = #/\[BitDepth (\d+)\]/#
    private let chnPat = #/\[AudioChannels (\d+)\]/#

    // Raycast deeplink — refreshes the menu-bar command in the background
    // so the live sample rate updates within ~1s of a track change instead
    // of waiting for the polling interval.
    private let menuBarDeeplink =
        "raycast://extensions/lab_konversi/lossless-switcher/menu-bar?launchType=background"

    private let dateFormatter: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd HH:mm:ss"; return f
    }()

    func start() {
        if task?.isRunning == true { return }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/log")
        p.arguments = [
            "stream", "--info", "--style", "compact",
            "--predicate", #"process == "Music" AND senderImagePath CONTAINS "MediaToolbox""#,
        ]
        let pipe = Pipe()
        p.standardOutput = pipe
        p.standardError = FileHandle.nullDevice
        pipe.fileHandleForReading.readabilityHandler = { [weak self] h in
            let data = h.availableData
            guard !data.isEmpty, let s = String(data: data, encoding: .utf8) else { return }
            self?.feed(s)
        }
        try? p.run()
        self.task = p
    }

    private func feed(_ chunk: String) {
        buffer.append(chunk)
        while let nl = buffer.firstIndex(of: "\n") {
            let line = String(buffer[..<nl])
            buffer.removeSubrange(buffer.startIndex...nl)
            handle(line)
        }
    }

    private func cap(_ line: String, _ pat: Regex<(Substring, Substring)>) -> String {
        (try? pat.firstMatch(in: line)).map { String($0.1) } ?? ""
    }

    private func handle(_ line: String) {
        guard line.contains("ReportAudioPlaybackThroughFigLog") else { return }

        let fmt = cap(line, formatPat)
        let rend = cap(line, rendPat)
        let rate = cap(line, ratePat)
        let bits = cap(line, bitsPat)
        let chn = cap(line, chnPat)
        let ts = Int(Date().timeIntervalSince1970)

        var payload: [String: Any] = [
            "timestamp": ts,
            "format": fmt,
            "rendition": rend,
            "source": "report",
        ]
        payload["sampleRate"] = Int(rate) ?? NSNull()
        payload["bitDepth"] = Int(bits) ?? NSNull()
        payload["channels"] = Int(chn) ?? NSNull()
        if let data = try? JSONSerialization.data(withJSONObject: payload) {
            try? data.write(to: URL(fileURLWithPath: cachePath), options: .atomic)
        }

        // Trigger a Raycast menu-bar refresh on track change. Throttled to
        // at most once per second to avoid storms on rapid skips.
        let key = "\(rate)-\(bits)"
        let now = Date().timeIntervalSince1970
        if key != lastNotifiedKey, !rate.isEmpty, now - lastNotifiedAt > 1.0 {
            lastNotifiedKey = key
            lastNotifiedAt = now
            notifyMenuBar()
        }

        if key != lastApplied,
           !rate.isEmpty, !bits.isEmpty,
           !FileManager.default.fileExists(atPath: offSwitchPath),
           let r = Int(rate), let b = UInt32(bits)
        {
            if applyAudioFormat(rate: r, bits: b) {
                let entry = "\(dateFormatter.string(from: Date())) applied \(rate)/\(bits)-bit int\n"
                if let d = entry.data(using: .utf8) {
                    if let h = FileHandle(forWritingAtPath: applyLogPath) {
                        defer { try? h.close() }
                        _ = try? h.seekToEnd()
                        try? h.write(contentsOf: d)
                    } else {
                        try? d.write(to: URL(fileURLWithPath: applyLogPath))
                    }
                }
                lastApplied = key
            }
        }
    }

    private func notifyMenuBar() {
        // Skip the deeplink unless the menu-bar command has recently
        // heartbeated. Raycast rejects background launches of menu-bar
        // commands that the user has not activated, surfacing a visible
        // error. The heartbeat is touched on every render of the menu-bar
        // command, so its absence/staleness is a reliable signal that the
        // command is not currently active. First-activation loses the
        // sub-second refresh on the very first track change; the polling
        // interval picks it up.
        guard menuBarIsActive() else { return }

        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        p.arguments = ["-g", menuBarDeeplink]
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        try? p.run()
    }

    private func menuBarIsActive() -> Bool {
        let url = URL(fileURLWithPath: menuBarHeartbeatPath)
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
              let mtime = attrs[.modificationDate] as? Date
        else { return false }
        return Date().timeIntervalSince(mtime) < menuBarHeartbeatStaleSeconds
    }
}

// MARK: - Main -

ensureDirs()
let watcher = LogWatcher()
watcher.start()
RunLoop.current.run()  // block forever; LaunchAgent KeepAlive handles crash recovery
