import Foundation
import Testing
@testable import FileProviderProgressCore

@Test func speedEstimatorAddsTransferRateAndEta() throws {
    let domain = FileProviderDomain(
        providerId: "provider",
        domainId: "domain",
        displayName: "Domain",
        rootPath: "/tmp/domain"
    )
    let previous = FileProviderDomainSnapshot(
        domain: domain,
        observedAt: Date(timeIntervalSince1970: 0),
        upload: TransferProgress(completedBytes: 100, totalBytes: 1_100)
    )
    let current = FileProviderDomainSnapshot(
        domain: domain,
        observedAt: Date(timeIntervalSince1970: 10),
        upload: TransferProgress(completedBytes: 600, totalBytes: 1_100)
    )

    let updated = SpeedEstimator().applySpeed(
        current: [current],
        previous: [previous],
        elapsedSeconds: 10
    )

    #expect(updated.first?.upload?.bytesPerSecond == 50)
    #expect(updated.first?.upload?.etaSeconds == 10)
}
