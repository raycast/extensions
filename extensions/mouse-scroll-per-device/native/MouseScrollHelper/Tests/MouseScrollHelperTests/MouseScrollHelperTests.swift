import XCTest
@testable import MouseScrollHelper

final class MouseScrollHelperTests: XCTestCase {
    private let serialMouse = DeviceIdentity(name: "Mouse", vendorID: 1, productID: 2, serialNumber: "abc", locationID: nil)

    func testConvertsAbsoluteTimeTicksToNanosecondsBeforeCorrelation() {
        let converter = HIDTimestampConverter(numer: 3, denom: 2)
        XCTAssertEqual(converter.nanoseconds(forAbsoluteTime: 100), 150)
        var correlator = ScrollCorrelator(maximumAgeNanoseconds: 20, futureToleranceNanoseconds: 2)
        correlator.record(HIDScrollSample(device: serialMouse, axis: .vertical, timestampNanoseconds: converter.nanoseconds(forAbsoluteTime: 100)))
        XCTAssertEqual(correlator.match(axis: .vertical, eventTimestampNanoseconds: 160), serialMouse)
    }

    func testRejectsWrongAxisStaleAndFarFutureSamples() {
        var correlator = ScrollCorrelator(maximumAgeNanoseconds: 20, futureToleranceNanoseconds: 2)
        correlator.record(HIDScrollSample(device: serialMouse, axis: .vertical, timestampNanoseconds: 100))
        XCTAssertNil(correlator.match(axis: .horizontal, eventTimestampNanoseconds: 110))
        XCTAssertNil(correlator.match(axis: .vertical, eventTimestampNanoseconds: 121))
        correlator.record(HIDScrollSample(device: serialMouse, axis: .vertical, timestampNanoseconds: 200))
        XCTAssertNil(correlator.match(axis: .vertical, eventTimestampNanoseconds: 190))
    }

    func testSameDeviceSamplesContinueToCorrelate() {
        var correlator = ScrollCorrelator(maximumAgeNanoseconds: 20, futureToleranceNanoseconds: 2)
        correlator.record(HIDScrollSample(device: serialMouse, axis: .vertical, timestampNanoseconds: 100))
        correlator.record(HIDScrollSample(device: serialMouse, axis: .vertical, timestampNanoseconds: 110))
        XCTAssertEqual(correlator.match(axis: .vertical, eventTimestampNanoseconds: 111), serialMouse)
        XCTAssertEqual(correlator.match(axis: .vertical, eventTimestampNanoseconds: 111), serialMouse)
    }

    func testCrossDeviceCandidatesFailClosedAndAreConsumed() {
        let otherMouse = DeviceIdentity(name: "Other Mouse", vendorID: 1, productID: 3, serialNumber: "other", locationID: nil)
        var correlator = ScrollCorrelator(maximumAgeNanoseconds: 20, futureToleranceNanoseconds: 2)
        correlator.record(HIDScrollSample(device: serialMouse, axis: .vertical, timestampNanoseconds: 100))
        correlator.record(HIDScrollSample(device: otherMouse, axis: .vertical, timestampNanoseconds: 110))
        XCTAssertNil(correlator.match(axis: .vertical, eventTimestampNanoseconds: 111))
        XCTAssertNil(correlator.match(axis: .vertical, eventTimestampNanoseconds: 111))
    }

    func testDeviceKeyPrefersSerialThenLocation() {
        XCTAssertEqual(serialMouse.profileKey, "0001:0002:serial:abc")
        let locationMouse = DeviceIdentity(name: "Mouse", vendorID: 1, productID: 2, serialNumber: nil, locationID: 12)
        XCTAssertEqual(locationMouse.profileKey, "0001:0002:location:0000000c")
    }

    func testAmbiguousIdenticalMouseHasNoPersistentProfileKey() {
        let ambiguous = DeviceIdentity(name: "Mouse", vendorID: 1, productID: 2, serialNumber: nil, locationID: nil, registryEntryID: 42)
        XCTAssertEqual(ambiguous.identityState, .ambiguous)
        XCTAssertNil(ambiguous.profileKey)
        XCTAssertEqual(ambiguous.key, "ambiguous:0001:0002:registry:000000000000002a")
    }

    func testRejectsNonFiniteAndOutOfRangeProfiles() {
        var profile = DeviceProfile.defaults(name: "Mouse")
        profile.verticalMultiplier = .infinity
        XCTAssertNotNil(profile.validationError())
        profile.verticalMultiplier = 10.1
        XCTAssertNotNil(profile.validationError())
        profile.verticalMultiplier = 1
        XCTAssertNil(profile.validationError())
    }

    func testStatusWriteThrottleCapsHotPathStatusWritesAtFourPerSecond() {
        var throttle = StatusWriteThrottle(minimumIntervalNanoseconds: 250_000_000)
        XCTAssertTrue(throttle.shouldWrite(at: 0))
        throttle.recordWrite(at: 0)
        XCTAssertFalse(throttle.shouldWrite(at: 249_999_999))
        XCTAssertTrue(throttle.shouldWrite(at: 250_000_000))
    }

    func testCommandErrorsAndUsageContainActualInterpolationAndNewlines() {
        let error = NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "command failed"])
        XCTAssertEqual(renderedError(error), "command failed\n")
        XCTAssertTrue(commandUsage().hasSuffix("\n"))
        XCTAssertFalse(commandUsage().contains("\\n"))
    }

    func testInspectRuntimeClassifiesMissingPIDAsStale() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("mouse-scroll-stale-\(UUID().uuidString).json")
        defer { try? FileManager.default.removeItem(at: url) }
        let record = RuntimeRecord(protocolVersion: 1, pid: 999_999_999, executablePath: "/tmp/missing", configPath: "/tmp/config", startedAt: Date(), updatedAt: Date(), counters: RuntimeCounters())
        try JSONEncoder().encode(record).write(to: url)
        XCTAssertEqual(inspectRuntime(statusURL: url, expectedExecutable: "/tmp/missing").state, .stale)
    }

    func testInspectRuntimeClassifiesCurrentPIDWrongExpectedExecutableAsMismatch() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("mouse-scroll-mismatch-\(UUID().uuidString).json")
        defer { try? FileManager.default.removeItem(at: url) }
        let record = RuntimeRecord(protocolVersion: 1, pid: ProcessInfo.processInfo.processIdentifier, executablePath: "/tmp/recorded", configPath: "/tmp/config", startedAt: Date(), updatedAt: Date(), counters: RuntimeCounters())
        try JSONEncoder().encode(record).write(to: url)
        XCTAssertEqual(inspectRuntime(statusURL: url, expectedExecutable: "/deliberately/wrong/executable").state, .identityMismatch)
    }
}
