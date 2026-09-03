import CoreGraphics
import Darwin
import Foundation

enum ScrollAxis: Sendable { case vertical, horizontal }

struct HIDScrollSample: Sendable {
    let device: DeviceIdentity
    let axis: ScrollAxis
    let timestampNanoseconds: UInt64
}

struct HIDTimestampConverter: Sendable {
    let numer: UInt64
    let denom: UInt64

    init(numer: UInt64, denom: UInt64) {
        self.numer = max(numer, 1)
        self.denom = max(denom, 1)
    }

    static func system() -> HIDTimestampConverter {
        var info = mach_timebase_info_data_t()
        mach_timebase_info(&info)
        return HIDTimestampConverter(numer: UInt64(info.numer), denom: UInt64(info.denom))
    }

    func nanoseconds(forAbsoluteTime ticks: UInt64) -> UInt64 {
        let quotient = ticks / denom
        let remainder = ticks % denom
        let whole = quotient.multipliedReportingOverflow(by: numer)
        let fractional = remainder.multipliedReportingOverflow(by: numer)
        if whole.overflow || fractional.overflow { return UInt64.max }
        let partial = fractional.partialValue / denom
        let result = whole.partialValue.addingReportingOverflow(partial)
        return result.overflow ? UInt64.max : result.partialValue
    }
}

struct ScrollCorrelator: Sendable {
    private(set) var samples: [HIDScrollSample] = []
    let maximumAgeNanoseconds: UInt64
    let futureToleranceNanoseconds: UInt64

    init(maximumAgeNanoseconds: UInt64 = 30_000_000, futureToleranceNanoseconds: UInt64 = 2_000_000) {
        self.maximumAgeNanoseconds = maximumAgeNanoseconds
        self.futureToleranceNanoseconds = futureToleranceNanoseconds
    }

    mutating func record(_ sample: HIDScrollSample) {
        samples.append(sample)
        let cutoff = sample.timestampNanoseconds > maximumAgeNanoseconds ? sample.timestampNanoseconds - maximumAgeNanoseconds : 0
        samples.removeAll { $0.timestampNanoseconds < cutoff }
    }

    mutating func match(axis: ScrollAxis, eventTimestampNanoseconds: UInt64) -> DeviceIdentity? {
        let lowerBound = eventTimestampNanoseconds > maximumAgeNanoseconds ? eventTimestampNanoseconds - maximumAgeNanoseconds : 0
        let upperBound: UInt64
        let future = eventTimestampNanoseconds.addingReportingOverflow(futureToleranceNanoseconds)
        upperBound = future.overflow ? UInt64.max : future.partialValue
        let eligible = samples.indices.filter {
            samples[$0].axis == axis &&
                samples[$0].timestampNanoseconds >= lowerBound &&
                samples[$0].timestampNanoseconds <= upperBound
        }
        guard let newestIndex = eligible.last else { return nil }

        // Multiple physical devices in one Quartz correlation window cannot be attributed safely.
        // Consume every candidate in this window so a later event cannot select a stale other-device sample.
        if Set(eligible.map { samples[$0].device.key }).count > 1 {
            for index in eligible.reversed() { samples.remove(at: index) }
            return nil
        }
        return samples.remove(at: newestIndex).device
    }
}

final class ScrollTransformer: @unchecked Sendable {
    private let store: ConfigurationStore
    private let hidTimestampConverter: HIDTimestampConverter
    private let lock = NSLock()
    private var correlator = ScrollCorrelator()
    private var counters = RuntimeCounters()

    init(store: ConfigurationStore, hidTimestampConverter: HIDTimestampConverter = .system()) {
        self.store = store
        self.hidTimestampConverter = hidTimestampConverter
    }

    func record(device: DeviceIdentity, axis: ScrollAxis, hidTimestamp: UInt64) {
        let timestampNanoseconds = hidTimestampConverter.nanoseconds(forAbsoluteTime: hidTimestamp)
        lock.withLock {
            counters.observedHID += 1
            if device.identityState == .ambiguous { counters.ambiguousDevices += 1 }
            correlator.record(HIDScrollSample(device: device, axis: axis, timestampNanoseconds: timestampNanoseconds))
        }
    }

    func currentCounters() -> RuntimeCounters { lock.withLock { counters } }

    func transform(_ event: CGEvent) {
        let vertical = event.getIntegerValueField(.scrollWheelEventPointDeltaAxis1) + event.getIntegerValueField(.scrollWheelEventDeltaAxis1)
        let horizontal = event.getIntegerValueField(.scrollWheelEventPointDeltaAxis2) + event.getIntegerValueField(.scrollWheelEventDeltaAxis2)
        let eventTimestampNanoseconds = event.timestamp
        var transformed = false
        if vertical != 0, let device = matchingDevice(axis: .vertical, eventTimestampNanoseconds: eventTimestampNanoseconds), let profile = store.profile(for: device) {
            scale(event, axis: 1, multiplier: signed(profile.verticalMultiplier, reverse: profile.reverseVertical))
            transformed = true
        }
        if horizontal != 0, let device = matchingDevice(axis: .horizontal, eventTimestampNanoseconds: eventTimestampNanoseconds), let profile = store.profile(for: device) {
            scale(event, axis: 2, multiplier: signed(profile.horizontalMultiplier, reverse: profile.reverseHorizontal))
            transformed = true
        }
        lock.withLock {
            if transformed { counters.transformedEvents += 1 } else if vertical != 0 || horizontal != 0 { counters.unmatchedQuartz += 1 }
        }
    }

    private func matchingDevice(axis: ScrollAxis, eventTimestampNanoseconds: UInt64) -> DeviceIdentity? {
        lock.withLock {
            let device = correlator.match(axis: axis, eventTimestampNanoseconds: eventTimestampNanoseconds)
            if device != nil { counters.matchedQuartz += 1 }
            return device
        }
    }

    private func signed(_ value: Double, reverse: Bool) -> Double { reverse ? -value : value }

    private func scale(_ event: CGEvent, axis: Int, multiplier: Double) {
        guard multiplier.isFinite, (0.1 ... 10).contains(abs(multiplier)) else { return }
        let fields: [CGEventField] = axis == 1
            ? [.scrollWheelEventDeltaAxis1, .scrollWheelEventPointDeltaAxis1, .scrollWheelEventFixedPtDeltaAxis1]
            : [.scrollWheelEventDeltaAxis2, .scrollWheelEventPointDeltaAxis2, .scrollWheelEventFixedPtDeltaAxis2]
        for field in fields {
            let value = event.getIntegerValueField(field)
            let scaled = (Double(value) * multiplier).rounded(.toNearestOrAwayFromZero)
            let bounded = min(Double(Int64.max), max(Double(Int64.min), scaled))
            event.setIntegerValueField(field, value: Int64(bounded))
        }
    }
}
