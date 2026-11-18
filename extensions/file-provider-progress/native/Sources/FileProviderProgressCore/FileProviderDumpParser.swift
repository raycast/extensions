import Foundation

public struct FileProviderDumpParser: Sendable {
    public init() {}

    public func parseDomainSnapshot(
        dump: String,
        domain: FileProviderDomain,
        observedAt: Date = Date()
    ) -> FileProviderDomainSnapshot {
        var upload: TransferProgress?
        var download: TransferProgress?
        var health = DomainHealth(isActive: dump.contains(" alive "))

        for line in dump.components(separatedBy: .newlines) {
            if line.contains("upload progress:") {
                upload = parseTransferProgress(from: line)
            } else if line.contains("download progress:") {
                download = parseTransferProgress(from: line)
            } else if line.contains("needs-auth:") {
                health.needsAuth = parseYesNo(from: line)
            } else if line.contains("needs-indexing:") {
                health.needsIndexing = parseYesNo(from: line)
            } else if line.trimmingCharacters(in: .whitespaces).hasPrefix("errors:") {
                health.errorCount = parseTrailingInt(from: line)
            } else if line.contains("pending-indexable-count:") {
                health.pendingIndexableCount = parseTrailingInt(from: line)
            } else if line.contains("total-indexable-count:") {
                health.totalIndexableCount = parseTrailingInt(from: line)
            }
        }

        return FileProviderDomainSnapshot(
            domain: domain,
            observedAt: observedAt,
            upload: upload,
            download: download,
            health: health
        )
    }

    private func parseTransferProgress(from line: String) -> TransferProgress? {
        guard let match = firstMatch(
            in: line,
            pattern: #"Completed:\s*(\d+)\s+of\s+(\d+)"#
        ), match.count == 3,
            let completed = Int64(match[1]),
            let total = Int64(match[2])
        else {
            return nil
        }

        return TransferProgress(completedBytes: completed, totalBytes: total)
    }

    private func parseYesNo(from line: String) -> Bool? {
        if line.range(of: #":\s*yes\b"#, options: .regularExpression) != nil {
            return true
        }

        if line.range(of: #":\s*no\b"#, options: .regularExpression) != nil {
            return false
        }

        return nil
    }

    private func parseTrailingInt(from line: String) -> Int? {
        guard let match = firstMatch(in: line, pattern: #":\s*(\d+)\s*$"#),
              match.count == 2
        else {
            return nil
        }

        return Int(match[1])
    }

    private func firstMatch(in string: String, pattern: String) -> [String]? {
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return nil
        }

        let range = NSRange(string.startIndex..<string.endIndex, in: string)
        guard let match = regex.firstMatch(in: string, range: range) else {
            return nil
        }

        return (0..<match.numberOfRanges).compactMap { index in
            let nsRange = match.range(at: index)
            guard let range = Range(nsRange, in: string) else {
                return nil
            }
            return String(string[range])
        }
    }
}
