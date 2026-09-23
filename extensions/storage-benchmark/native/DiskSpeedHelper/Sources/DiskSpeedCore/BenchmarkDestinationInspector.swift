import Darwin
import Foundation

struct BenchmarkDestinationInspector {
    private let availableBytesOverride: Int64?

    init(availableBytesOverride: Int64? = nil) {
        self.availableBytesOverride = availableBytesOverride
    }

    func inspect(_ configuration: BenchmarkConfiguration) throws -> BenchmarkVolume {
        let keys: Set<URLResourceKey> = [
            .isUbiquitousItemKey,
            .volumeAvailableCapacityForImportantUsageKey,
            .volumeAvailableCapacityKey,
            .volumeIsLocalKey,
            .volumeNameKey,
            .volumeURLKey,
            .volumeUUIDStringKey,
        ]
        let values = try configuration.directory.resourceValues(forKeys: keys)
        let volumeURL = values.volume ?? configuration.directory
        let isLocal = values.volumeIsLocal ?? isLocalVolume(at: volumeURL)
        guard isLocal else {
            throw BenchmarkRunnerError.nonLocalVolume
        }
        guard values.isUbiquitousItem != true,
              !Self.isKnownCloudBackedDirectory(configuration.directory)
        else {
            throw BenchmarkRunnerError.cloudBackedLocation
        }

        let availableBytes = availableBytesOverride ?? Self.availableBytes(
            importantUsage: values.volumeAvailableCapacityForImportantUsage,
            ordinary: values.volumeAvailableCapacity.map(Int64.init),
            fileSystem: fileSystemFreeBytes(at: configuration.directory)
        )
        let safetyMargin = max(UInt64(256 * 1_048_576), configuration.maxBytes / 10)
        let requiredBytes = configuration.maxBytes.addingReportingOverflow(safetyMargin)
        guard !requiredBytes.overflow else {
            throw BenchmarkRunnerError.invalidConfiguration("Maximum bytes and safety margin overflow UInt64")
        }
        guard availableBytes >= 0, UInt64(availableBytes) >= requiredBytes.partialValue else {
            throw BenchmarkRunnerError.insufficientSpace(
                requiredBytes: requiredBytes.partialValue,
                availableBytes: UInt64(max(0, availableBytes))
            )
        }

        let identifier = values.volumeUUIDString ?? deviceIdentifier(at: volumeURL)
        let candidateName = values.volumeName?.trimmingCharacters(in: .whitespacesAndNewlines)
        let volumeName = candidateName.flatMap { $0.isEmpty ? nil : $0 } ?? volumeURL.lastPathComponent
        return BenchmarkVolume(id: identifier, name: volumeName)
    }

    static func isKnownCloudBackedDirectory(
        _ directory: URL,
        homeDirectory: URL = FileManager.default.homeDirectoryForCurrentUser
    ) -> Bool {
        let resolvedDirectory = directory.resolvingSymlinksInPath().standardizedFileURL
        let cloudRoots = [
            homeDirectory.appendingPathComponent("Library/CloudStorage", isDirectory: true),
            homeDirectory.appendingPathComponent("Library/Mobile Documents", isDirectory: true),
        ]

        return cloudRoots.contains { root in
            let resolvedRoot = root.resolvingSymlinksInPath().standardizedFileURL.path
            return resolvedDirectory.path == resolvedRoot || resolvedDirectory.path.hasPrefix(resolvedRoot + "/")
        }
    }

    static func availableBytes(importantUsage: Int64?, ordinary: Int64?, fileSystem: Int64) -> Int64 {
        let validFileSystem = fileSystem >= 0 ? fileSystem : nil
        return ordinary ?? validFileSystem ?? importantUsage ?? -1
    }

    private func isLocalVolume(at url: URL) -> Bool {
        var information = statfs()
        guard statfs(url.path, &information) == 0 else { return false }
        return (UInt32(information.f_flags) & UInt32(MNT_LOCAL)) != 0
    }

    private func fileSystemFreeBytes(at url: URL) -> Int64 {
        guard let attributes = try? FileManager.default.attributesOfFileSystem(forPath: url.path),
              let value = attributes[.systemFreeSize] as? NSNumber
        else {
            return -1
        }
        return value.int64Value
    }

    private func deviceIdentifier(at url: URL) -> String {
        var information = stat()
        guard lstat(url.path, &information) == 0 else {
            return "volume-\(url.lastPathComponent)"
        }
        return "device-\(information.st_dev)"
    }
}
