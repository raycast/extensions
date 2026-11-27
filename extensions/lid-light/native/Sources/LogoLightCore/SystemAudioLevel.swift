import CoreAudio
import Foundation

/// The sound this Mac is playing, as a `SoundLevelSource`.
public enum SystemSound {
    /// A source for the system's audio, or `nil` before macOS 14.2, which has no process taps.
    @MainActor
    public static func source() -> SoundLevelSource? {
        if #available(macOS 14.2, *) { return SystemAudioLevel() }
        return nil
    }
}

/// Hears the sound the Mac is playing through a Core Audio process tap on every process's output,
/// and meters it (`LoudnessMeter`). Nothing is recorded: each buffer is reduced to its level and dropped.
///
/// The tap needs the user's permission, "System Audio Recording Only" (System Settings › Privacy &
/// Security › Screen & System Audio Recording), which macOS asks for the first time; the app's
/// `NSAudioCaptureUsageDescription` gives the reason. The tap is read through a private aggregate
/// device made of it and the default output device, as Apple's sample code does, and set up again when
/// the default output device changes (headphones plugged in, say).
@available(macOS 14.2, *)
@MainActor
public final class SystemAudioLevel: SoundLevelSource {
    private let meter = SharedMeter()
    private let queue = DispatchQueue(label: "app.logolight.sound", qos: .userInteractive)
    private var tap = AudioObjectID(kAudioObjectUnknown)
    private var aggregate = AudioObjectID(kAudioObjectUnknown)
    private var procID: AudioDeviceIOProcID?
    private var outputListener: AudioObjectPropertyListenerBlock?
    private var isListening = false

    public init() {}

    public var loudness: Double { meter.loudness }

    public func start() throws {
        guard !isListening else { return }
        isListening = true
        do {
            try open()
        } catch {
            stop()
            throw error
        }
        observeDefaultOutputDevice()
    }

    public func stop() {
        isListening = false
        if let outputListener {
            var address = Self.defaultOutputAddress
            AudioObjectRemovePropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &address, .main, outputListener)
            self.outputListener = nil
        }
        close()
        meter.reset()
    }

    // MARK: - The tap

    private func open() throws {
        let description = CATapDescription(stereoGlobalTapButExcludeProcesses: [])
        description.uuid = UUID()
        description.name = "LogoLight"
        description.isPrivate = true
        description.muteBehavior = .unmuted
        var tapID = AudioObjectID(kAudioObjectUnknown)
        var status = AudioHardwareCreateProcessTap(description, &tapID)
        guard status == noErr, tapID != kAudioObjectUnknown else { throw SoundError.cannotListen(status: status) }
        tap = tapID

        var format = AudioStreamBasicDescription()
        var size = UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
        var address = AudioObjectPropertyAddress(mSelector: kAudioTapPropertyFormat,
                                                 mScope: kAudioObjectPropertyScopeGlobal,
                                                 mElement: kAudioObjectPropertyElementMain)
        status = AudioObjectGetPropertyData(tapID, &address, 0, nil, &size, &format)
        guard status == noErr else { throw SoundError.cannotListen(status: status) }
        guard format.mFormatID == kAudioFormatLinearPCM, format.mFormatFlags & kAudioFormatFlagIsFloat != 0,
              format.mBitsPerChannel == 32, format.mSampleRate > 0
        else { throw SoundError.cannotListen(status: kAudioHardwareUnsupportedOperationError) }
        let sampleRate = format.mSampleRate

        var aggregateDescription: [String: Any] = [
            kAudioAggregateDeviceNameKey: "LogoLight Sound",
            kAudioAggregateDeviceUIDKey: UUID().uuidString,
            kAudioAggregateDeviceIsPrivateKey: true,
            kAudioAggregateDeviceIsStackedKey: false,
            kAudioAggregateDeviceTapAutoStartKey: true,
            kAudioAggregateDeviceTapListKey: [[kAudioSubTapDriftCompensationKey: true,
                                               kAudioSubTapUIDKey: description.uuid.uuidString]],
        ]
        if let outputUID = Self.defaultOutputUID() {
            aggregateDescription[kAudioAggregateDeviceMainSubDeviceKey] = outputUID
            aggregateDescription[kAudioAggregateDeviceSubDeviceListKey] = [[kAudioSubDeviceUIDKey: outputUID]]
        }
        var aggregateID = AudioObjectID(kAudioObjectUnknown)
        status = AudioHardwareCreateAggregateDevice(aggregateDescription as CFDictionary, &aggregateID)
        guard status == noErr, aggregateID != kAudioObjectUnknown else { throw SoundError.cannotListen(status: status) }
        aggregate = aggregateID

        let meter = self.meter
        var procID: AudioDeviceIOProcID?
        // Runs on the audio queue, so it mustn't inherit this method's main-actor isolation.
        status = AudioDeviceCreateIOProcIDWithBlock(&procID, aggregateID, queue) { @Sendable _, input, _, _, _ in
            meter.add(input, sampleRate: sampleRate)
        }
        guard status == noErr, let procID else { throw SoundError.cannotListen(status: status) }
        self.procID = procID
        status = AudioDeviceStart(aggregateID, procID)
        guard status == noErr else { throw SoundError.cannotListen(status: status) }
    }

    private func close() {
        if let procID {
            AudioDeviceStop(aggregate, procID)
            AudioDeviceDestroyIOProcID(aggregate, procID)
            self.procID = nil
        }
        if aggregate != kAudioObjectUnknown {
            AudioHardwareDestroyAggregateDevice(aggregate)
            aggregate = AudioObjectID(kAudioObjectUnknown)
        }
        if tap != kAudioObjectUnknown {
            AudioHardwareDestroyProcessTap(tap)
            tap = AudioObjectID(kAudioObjectUnknown)
        }
    }

    // MARK: - The output device

    private static var defaultOutputAddress: AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDefaultOutputDevice,
                                   mScope: kAudioObjectPropertyScopeGlobal,
                                   mElement: kAudioObjectPropertyElementMain)
    }

    /// The default output device's UID, or `nil` if there's none (then the aggregate is the tap alone).
    private static func defaultOutputUID() -> String? {
        var address = defaultOutputAddress
        var deviceID = AudioObjectID(kAudioObjectUnknown)
        var size = UInt32(MemoryLayout<AudioObjectID>.size)
        guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &deviceID) == noErr,
              deviceID != kAudioObjectUnknown
        else { return nil }
        address = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyDeviceUID,
                                             mScope: kAudioObjectPropertyScopeGlobal,
                                             mElement: kAudioObjectPropertyElementMain)
        var uid: Unmanaged<CFString>?
        size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        guard AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &uid) == noErr, let uid else { return nil }
        return uid.takeRetainedValue() as String
    }

    /// Sets the tap up again when the default output device changes: the aggregate device was built
    /// around the old one.
    private func observeDefaultOutputDevice() {
        var address = Self.defaultOutputAddress
        let listener: AudioObjectPropertyListenerBlock = { [weak self] _, _ in
            MainActor.assumeIsolated {
                guard let self, self.isListening else { return }
                self.close()
                self.meter.reset()
                try? self.open()
            }
        }
        guard AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &address, .main, listener) == noErr
        else { return }
        outputListener = listener
    }
}

/// The meter, shared between the audio thread, which feeds it, and the main actor, which reads it.
private final class SharedMeter: @unchecked Sendable {
    private let lock = NSLock()
    private var meter = LoudnessMeter()

    var loudness: Double {
        lock.lock()
        defer { lock.unlock() }
        return meter.loudness
    }

    func reset() {
        lock.lock()
        meter = LoudnessMeter()
        lock.unlock()
    }

    /// Feeds one IO cycle's buffers (32-bit float, interleaved or not: the RMS is over every channel).
    func add(_ list: UnsafePointer<AudioBufferList>, sampleRate: Double) {
        let buffers = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: list))
        var sum = 0.0
        var samples = 0
        var channels = 0
        for buffer in buffers {
            guard let data = buffer.mData else { continue }
            let count = Int(buffer.mDataByteSize) / MemoryLayout<Float>.size
            let floats = UnsafeBufferPointer(start: data.assumingMemoryBound(to: Float.self), count: count)
            for sample in floats { sum += Double(sample) * Double(sample) }
            samples += count
            channels += max(1, Int(buffer.mNumberChannels))
        }
        guard samples > 0, channels > 0, sampleRate > 0 else { return }
        let rms = (sum / Double(samples)).squareRoot()
        let seconds = Double(samples / channels) / sampleRate
        lock.lock()
        meter.add(rms: rms, seconds: seconds)
        lock.unlock()
    }
}
