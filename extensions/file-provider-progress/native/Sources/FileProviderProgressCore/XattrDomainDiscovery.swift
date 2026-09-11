import Darwin
import Foundation

public struct XattrDomainDiscovery {
    private let fileManager: FileManager
    private let homeDirectory: URL

    public init(
        fileManager: FileManager = .default,
        homeDirectory: URL = FileManager.default.homeDirectoryForCurrentUser
    ) {
        self.fileManager = fileManager
        self.homeDirectory = homeDirectory
    }

    public func discoverDomains() -> [FileProviderDomain] {
        candidateRootURLs()
            .compactMap(domain(for:))
            .sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
    }

    private func candidateRootURLs() -> [URL] {
        var urls: [URL] = []
        let cloudStorage = homeDirectory.appendingPathComponent("Library/CloudStorage", isDirectory: true)

        if let children = try? fileManager.contentsOfDirectory(
            at: cloudStorage,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) {
            urls.append(contentsOf: children.filter { url in
                ((try? url.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false)
            })
        }

        urls.append(homeDirectory.appendingPathComponent("Library/Mobile Documents", isDirectory: true))
        return urls
    }

    private func domain(for url: URL) -> FileProviderDomain? {
        guard let rawDomainId = extendedAttribute("com.apple.file-provider-domain-id", at: url),
              let slashIndex = rawDomainId.lastIndex(of: "/")
        else {
            return nil
        }

        let providerId = String(rawDomainId[..<slashIndex])
        let domainId = String(rawDomainId[rawDomainId.index(after: slashIndex)...])
        let name = displayName(for: url)

        return FileProviderDomain(
            providerId: providerId,
            domainId: domainId,
            displayName: name,
            rootPath: url.path
        )
    }

    private func displayName(for url: URL) -> String {
        if url.lastPathComponent == "Mobile Documents" {
            return "iCloud Drive"
        }

        return url.lastPathComponent
    }

    private func extendedAttribute(_ name: String, at url: URL) -> String? {
        let path = url.path
        let size = getxattr(path, name, nil, 0, 0, 0)

        guard size > 0 else {
            return nil
        }

        var data = Data(count: size)
        let result = data.withUnsafeMutableBytes { buffer in
            getxattr(path, name, buffer.baseAddress, size, 0, 0)
        }

        guard result > 0 else {
            return nil
        }

        return String(data: data.prefix(result), encoding: .utf8)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
