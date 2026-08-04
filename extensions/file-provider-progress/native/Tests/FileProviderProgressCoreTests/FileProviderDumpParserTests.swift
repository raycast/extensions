import Foundation
import Testing
@testable import FileProviderProgressCore

@Test func parserReturnsUploadDownloadAndHealthData() throws {
    let domain = FileProviderDomain(
        providerId: "com.synology.CloudStationUI.FileProvider",
        domainId: "9",
        displayName: "SynologyDrive-Rejects",
        rootPath: "/Users/example/Library/CloudStorage/SynologyDrive-Rejects"
    )
    let observedAt = Date(timeIntervalSince1970: 1_800_000_000)
    let dump = """
    -----------------------------------------------------
    domain: 9 (SynologyDrive-Rejects)
    -----------------------------------------------------
     alive (945) via ExtensionKit for:
      + indexer:
          enabled:        yes
          indexing:       no
          needs-auth:     no
          needs-indexing: yes
          errors:         3
          pending-indexable-count: 14
          total-indexable-count: 9609
    sync engine state:
        + upload progress: <gprogress:NSProgressFileOperationKindUploading pp:<NSProgress: 0x1> / Fraction completed: 0.8386 / Completed: 54863929623 of 65425131991 url:<FPFS>/...>
        + download progress: <gprogress:NSProgressFileOperationKindDownloading pp:<NSProgress: 0x2> / Fraction completed: 0.5000 / Completed: 1024 of 2048 url:<FPFS>/...>
    """

    let snapshot = FileProviderDumpParser().parseDomainSnapshot(
        dump: dump,
        domain: domain,
        observedAt: observedAt
    )

    #expect(snapshot.providerId == "com.synology.CloudStationUI.FileProvider")
    #expect(snapshot.domainId == "9")
    #expect(snapshot.displayName == "SynologyDrive-Rejects")
    #expect(snapshot.rootPath == "/Users/example/Library/CloudStorage/SynologyDrive-Rejects")
    #expect(snapshot.observedAt == observedAt)

    #expect(snapshot.upload?.completedBytes == 54_863_929_623)
    #expect(snapshot.upload?.totalBytes == 65_425_131_991)
    #expect(snapshot.upload?.remainingBytes == 10_561_202_368)
    #expect(abs((snapshot.upload?.fraction ?? 0) - 0.8386) < 0.0001)

    #expect(snapshot.download?.completedBytes == 1024)
    #expect(snapshot.download?.totalBytes == 2048)
    #expect(snapshot.download?.remainingBytes == 1024)
    #expect(snapshot.download?.fraction == 0.5)

    #expect(snapshot.health.isActive == true)
    #expect(snapshot.health.needsAuth == false)
    #expect(snapshot.health.needsIndexing == true)
    #expect(snapshot.health.errorCount == 3)
    #expect(snapshot.health.pendingIndexableCount == 14)
    #expect(snapshot.health.totalIndexableCount == 9609)
}

@Test func parserLeavesMissingByteTotalsNil() throws {
    let domain = FileProviderDomain(
        providerId: "com.apple.CloudDocs.iCloudDriveFileProvider",
        domainId: "8BCDD749-4C77-467D-95B8-6CE869B6FB3B",
        displayName: "iCloud Drive",
        rootPath: "/Users/example/Library/Mobile Documents"
    )
    let dump = """
    sync engine state:
        + upload progress: <gprogress:NSProgressFileOperationKindUploading complementary:<na> url:~/Library/Mobile Documents>
        + download progress: <gprogress:NSProgressFileOperationKindDownloading url:~/Library/Mobile Documents>
    """

    let snapshot = FileProviderDumpParser().parseDomainSnapshot(dump: dump, domain: domain)

    #expect(snapshot.upload == nil)
    #expect(snapshot.download == nil)
}
