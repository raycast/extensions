import Foundation

public struct FileProviderDomain: Codable, Equatable, Sendable {
    public var providerId: String
    public var domainId: String
    public var displayName: String
    public var rootPath: String

    public init(providerId: String, domainId: String, displayName: String, rootPath: String) {
        self.providerId = providerId
        self.domainId = domainId
        self.displayName = displayName
        self.rootPath = rootPath
    }

    public var fileproviderctlIdentifier: String {
        "\(providerId)/\(domainId)"
    }
}

public struct TransferProgress: Codable, Equatable, Sendable {
    public var completedBytes: Int64
    public var totalBytes: Int64
    public var remainingBytes: Int64
    public var fraction: Double
    public var bytesPerSecond: Double?
    public var etaSeconds: Double?

    public init(
        completedBytes: Int64,
        totalBytes: Int64,
        bytesPerSecond: Double? = nil,
        etaSeconds: Double? = nil
    ) {
        self.completedBytes = completedBytes
        self.totalBytes = totalBytes
        self.remainingBytes = max(totalBytes - completedBytes, 0)
        self.fraction = totalBytes > 0 ? Double(completedBytes) / Double(totalBytes) : 0
        self.bytesPerSecond = bytesPerSecond
        self.etaSeconds = etaSeconds
    }
}

public struct DomainHealth: Codable, Equatable, Sendable {
    public var isActive: Bool?
    public var needsAuth: Bool?
    public var needsIndexing: Bool?
    public var errorCount: Int?
    public var pendingIndexableCount: Int?
    public var totalIndexableCount: Int?

    public init(
        isActive: Bool? = nil,
        needsAuth: Bool? = nil,
        needsIndexing: Bool? = nil,
        errorCount: Int? = nil,
        pendingIndexableCount: Int? = nil,
        totalIndexableCount: Int? = nil
    ) {
        self.isActive = isActive
        self.needsAuth = needsAuth
        self.needsIndexing = needsIndexing
        self.errorCount = errorCount
        self.pendingIndexableCount = pendingIndexableCount
        self.totalIndexableCount = totalIndexableCount
    }
}

public struct FileProviderDomainSnapshot: Codable, Equatable, Sendable {
    public var providerId: String
    public var domainId: String
    public var displayName: String
    public var rootPath: String
    public var observedAt: Date
    public var upload: TransferProgress?
    public var download: TransferProgress?
    public var health: DomainHealth
    public var probeError: String?

    public init(
        domain: FileProviderDomain,
        observedAt: Date,
        upload: TransferProgress? = nil,
        download: TransferProgress? = nil,
        health: DomainHealth = DomainHealth(),
        probeError: String? = nil
    ) {
        self.providerId = domain.providerId
        self.domainId = domain.domainId
        self.displayName = domain.displayName
        self.rootPath = domain.rootPath
        self.observedAt = observedAt
        self.upload = upload
        self.download = download
        self.health = health
        self.probeError = probeError
    }
}

public struct FileProviderStatusReport: Codable, Equatable, Sendable {
    public var observedAt: Date
    public var domains: [FileProviderDomainSnapshot]

    public init(observedAt: Date, domains: [FileProviderDomainSnapshot]) {
        self.observedAt = observedAt
        self.domains = domains
    }
}
