import Foundation

public struct SpeedEstimator: Sendable {
    public init() {}

    public func applySpeed(
        current: [FileProviderDomainSnapshot],
        previous: [FileProviderDomainSnapshot],
        elapsedSeconds: TimeInterval
    ) -> [FileProviderDomainSnapshot] {
        guard elapsedSeconds > 0 else {
            return current
        }

        let previousByKey = Dictionary(uniqueKeysWithValues: previous.map { (key(for: $0), $0) })

        return current.map { snapshot in
            var updated = snapshot
            guard let previousSnapshot = previousByKey[key(for: snapshot)] else {
                return updated
            }

            updated.upload = progressWithSpeed(
                current: snapshot.upload,
                previous: previousSnapshot.upload,
                elapsedSeconds: elapsedSeconds
            )
            updated.download = progressWithSpeed(
                current: snapshot.download,
                previous: previousSnapshot.download,
                elapsedSeconds: elapsedSeconds
            )

            return updated
        }
    }

    private func key(for snapshot: FileProviderDomainSnapshot) -> String {
        "\(snapshot.providerId)/\(snapshot.domainId)"
    }

    private func progressWithSpeed(
        current: TransferProgress?,
        previous: TransferProgress?,
        elapsedSeconds: TimeInterval
    ) -> TransferProgress? {
        guard var current, let previous else {
            return current
        }

        let byteDelta = current.completedBytes - previous.completedBytes
        guard byteDelta > 0 else {
            current.bytesPerSecond = 0
            current.etaSeconds = nil
            return current
        }

        let bytesPerSecond = Double(byteDelta) / elapsedSeconds
        current.bytesPerSecond = bytesPerSecond
        current.etaSeconds = bytesPerSecond > 0 ? Double(current.remainingBytes) / bytesPerSecond : nil
        return current
    }
}
