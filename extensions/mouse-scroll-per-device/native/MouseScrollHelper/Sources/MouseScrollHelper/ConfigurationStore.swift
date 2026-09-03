import Foundation

final class ConfigurationStore: @unchecked Sendable {
    private let url: URL
    private let lock = NSLock()
    private var configuration = HelperConfiguration()
    private var modificationDate: Date?

    init(url: URL) {
        self.url = url
        reload(force: true)
    }

    func profile(for device: DeviceIdentity) -> DeviceProfile? {
        guard let profileKey = device.profileKey else { return nil }
        reload(force: false)
        return lock.withLock { configuration.profiles[profileKey] }
    }

    func reload(force: Bool) {
        let attributes = try? FileManager.default.attributesOfItem(atPath: url.path)
        let currentDate = attributes?[.modificationDate] as? Date
        guard force || currentDate != modificationDate else { return }
        guard let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(HelperConfiguration.self, from: data),
              decoded.validationError() == nil
        else {
            if force { lock.withLock { configuration = HelperConfiguration() } }
            modificationDate = currentDate
            return
        }
        lock.withLock { configuration = decoded }
        modificationDate = currentDate
    }
}
