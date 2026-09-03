@preconcurrency import ApplicationServices
import CoreGraphics
import Foundation
import Darwin

struct StatusWriteThrottle: Sendable {
    let minimumIntervalNanoseconds: UInt64
    private(set) var lastWriteNanoseconds: UInt64?

    init(minimumIntervalNanoseconds: UInt64 = 250_000_000) {
        self.minimumIntervalNanoseconds = minimumIntervalNanoseconds
    }

    mutating func shouldWrite(at nowNanoseconds: UInt64) -> Bool {
        guard let lastWriteNanoseconds else { return true }
        return nowNanoseconds >= lastWriteNanoseconds && nowNanoseconds - lastWriteNanoseconds >= minimumIntervalNanoseconds
    }

    mutating func recordWrite(at nowNanoseconds: UInt64) {
        lastWriteNanoseconds = nowNanoseconds
    }
}

final class HelperRuntime: @unchecked Sendable {
    private let transformer: ScrollTransformer
    private let monitor: DeviceMonitor
    private let configURL: URL
    private let statusURL: URL
    private let startedAt = Date()
    fileprivate var tap: CFMachPort?
    private var terminationSource: DispatchSourceSignal?
    private let statusQueue = DispatchQueue(label: "com.brandon.mouse-scroll-per-device.status", qos: .utility)
    private var statusTimer: DispatchSourceTimer?
    private let statusLock = NSLock()
    private let runtimeWriteLock = NSLock()
    private var statusGeneration: UInt64 = 0
    private var writtenGeneration: UInt64 = 0
    private var statusWriteThrottle = StatusWriteThrottle()

    init(configURL: URL, statusURL: URL) {
        self.configURL = configURL
        self.statusURL = statusURL
        let transformer = ScrollTransformer(store: ConfigurationStore(url: configURL))
        self.transformer = transformer
        monitor = DeviceMonitor(transformer: transformer)
    }

    func run() throws {
        try monitor.start()
        let mask = CGEventMask(1) << CGEventType.scrollWheel.rawValue
        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: mask,
            callback: { _, type, event, userInfo in
                guard let userInfo else { return Unmanaged.passUnretained(event) }
                let runtime = Unmanaged<HelperRuntime>.fromOpaque(userInfo).takeUnretainedValue()
                if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                    if let tap = runtime.tap { CGEvent.tapEnable(tap: tap, enable: true) }
                    return Unmanaged.passUnretained(event)
                }
                runtime.transformer.transform(event)
                runtime.markStatusDirty()
                return Unmanaged.passUnretained(event)
            },
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        ) else { throw HelperError.eventTapUnavailable }
        self.tap = tap
        startStatusTimer()
        try writeRuntimeRecord(acknowledging: currentStatusGeneration())
        signal(SIGTERM, SIG_IGN)
        let terminationSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
        terminationSource.setEventHandler { [weak self] in
            guard let self else { return }
            self.flushStatusIfDue(force: true)
            self.statusTimer?.cancel()
            try? FileManager.default.removeItem(at: self.statusURL)
            CFRunLoopStop(CFRunLoopGetMain())
        }
        terminationSource.resume()
        self.terminationSource = terminationSource
        let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
        CFRunLoopRun()
        flushStatusIfDue(force: true)
        statusTimer?.cancel()
        try? FileManager.default.removeItem(at: statusURL)
    }

    private func startStatusTimer() {
        let timer = DispatchSource.makeTimerSource(queue: statusQueue)
        timer.schedule(deadline: .now() + .milliseconds(250), repeating: .milliseconds(250))
        timer.setEventHandler { [weak self] in self?.flushStatusIfDue(force: false) }
        timer.resume()
        statusTimer = timer
    }

    private func markStatusDirty() {
        statusLock.withLock { statusGeneration &+= 1 }
    }

    private func currentStatusGeneration() -> UInt64 {
        statusLock.withLock { statusGeneration }
    }

    private func generationDue(force: Bool) -> UInt64? {
        let now = DispatchTime.now().uptimeNanoseconds
        return statusLock.withLock {
            guard force || statusGeneration > writtenGeneration else { return nil }
            guard force || statusWriteThrottle.shouldWrite(at: now) else { return nil }
            return statusGeneration
        }
    }

    private func flushStatusIfDue(force: Bool) {
        guard let generation = generationDue(force: force) else { return }
        try? writeRuntimeRecord(acknowledging: generation)
    }

    private func writeRuntimeRecord(acknowledging generation: UInt64) throws {
        runtimeWriteLock.lock()
        defer { runtimeWriteLock.unlock() }
        let executable = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL.path
        let record = RuntimeRecord(
            protocolVersion: helperProtocolVersion,
            pid: getpid(),
            executablePath: executable,
            configPath: configURL.path,
            startedAt: startedAt,
            updatedAt: Date(),
            counters: transformer.currentCounters()
        )
        try FileManager.default.createDirectory(at: statusURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(record).write(to: statusURL, options: .atomic)
        statusLock.withLock {
            writtenGeneration = max(writtenGeneration, generation)
            statusWriteThrottle.recordWrite(at: DispatchTime.now().uptimeNanoseconds)
        }
    }
}

func accessStatus(prompt: Bool) -> AccessStatus {
    let input = prompt ? CGRequestListenEventAccess() : CGPreflightListenEventAccess()
    let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: prompt] as CFDictionary
    return AccessStatus(inputMonitoring: input, accessibility: AXIsProcessTrustedWithOptions(options))
}

func inspectRuntime(statusURL: URL, expectedExecutable: String) -> RuntimeStatus {
    guard let data = try? Data(contentsOf: statusURL),
          let record = try? JSONDecoder().decode(RuntimeRecord.self, from: data),
          record.protocolVersion == helperProtocolVersion
    else { return RuntimeStatus(state: .stopped, pid: nil, executablePath: nil, detail: nil, counters: nil) }
    guard kill(record.pid, 0) == 0 else {
        return RuntimeStatus(state: .stale, pid: record.pid, executablePath: record.executablePath, detail: "Recorded process is not running.", counters: record.counters)
    }
    // PROC_PIDPATHINFO_MAXSIZE is an unavailable C macro in current Swift SDK overlays.
    var buffer = [CChar](repeating: 0, count: 4_096)
    let count = proc_pidpath(record.pid, &buffer, UInt32(buffer.count))
    guard count > 0 else {
        return RuntimeStatus(state: .identityMismatch, pid: record.pid, executablePath: nil, detail: "Could not resolve running executable identity.", counters: record.counters)
    }
    let actual = String(decoding: buffer.prefix(Int(count)).map { UInt8(bitPattern: $0) }, as: UTF8.self)
    let expected = URL(fileURLWithPath: expectedExecutable).standardizedFileURL.path
    guard actual == expected, record.executablePath == expected else {
        return RuntimeStatus(state: .identityMismatch, pid: record.pid, executablePath: actual, detail: "PID belongs to a different executable.", counters: record.counters)
    }
    return RuntimeStatus(state: .running, pid: record.pid, executablePath: actual, detail: nil, counters: record.counters)
}

func stopRuntime(statusURL: URL, expectedExecutable: String) throws -> RuntimeStatus {
    let status = inspectRuntime(statusURL: statusURL, expectedExecutable: expectedExecutable)
    guard status.state == .running, let pid = status.pid else { return status }
    guard kill(pid, SIGTERM) == 0 else { throw CocoaError(.executableNotLoadable) }
    return status
}
