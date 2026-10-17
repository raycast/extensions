import Foundation

public struct FileProviderProgressService<Runner: CommandRunning> {
    private let runner: Runner
    private let parser: FileProviderDumpParser
    private let discovery: XattrDomainDiscovery
    private let timeoutSeconds: TimeInterval

    public init(
        runner: Runner,
        parser: FileProviderDumpParser = FileProviderDumpParser(),
        discovery: XattrDomainDiscovery = XattrDomainDiscovery(),
        timeoutSeconds: TimeInterval = 15
    ) {
        self.runner = runner
        self.parser = parser
        self.discovery = discovery
        self.timeoutSeconds = timeoutSeconds
    }

    public func listDomains() -> [FileProviderDomain] {
        discovery.discoverDomains()
    }

    public func status(observedAt: Date = Date()) -> FileProviderStatusReport {
        let snapshots = listDomains().map { domain in
            snapshot(for: domain, observedAt: observedAt)
        }

        return FileProviderStatusReport(observedAt: observedAt, domains: snapshots)
    }

    private func snapshot(for domain: FileProviderDomain, observedAt: Date) -> FileProviderDomainSnapshot {
        do {
            let dump = try runner.run(
                "/usr/bin/fileproviderctl",
                arguments: ["dump", domain.fileproviderctlIdentifier, "-l"],
                timeoutSeconds: timeoutSeconds
            )

            return parser.parseDomainSnapshot(dump: dump, domain: domain, observedAt: observedAt)
        } catch {
            return FileProviderDomainSnapshot(
                domain: domain,
                observedAt: observedAt,
                health: DomainHealth(),
                probeError: String(describing: error)
            )
        }
    }
}

public extension FileProviderProgressService where Runner == ProcessCommandRunner {
    init(timeoutSeconds: TimeInterval = 15) {
        self.init(runner: ProcessCommandRunner(), timeoutSeconds: timeoutSeconds)
    }
}
