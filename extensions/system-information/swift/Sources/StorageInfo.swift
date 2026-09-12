import Foundation
import RaycastSwiftMacros

struct StorageInfo: Encodable {
    let total: Double
    let used: Double
    let free: Double
    
    init(total: Int64, used: Int64, free: Int64) {
        self.total = Double(total) / 1e9
        self.used = Double(used) / 1e9
        self.free = Double(free) / 1e9
    }
}

@raycast func getStorageInfo() throws -> StorageInfo {
    let volumeURL = URL(fileURLWithPath: "/")
    
    guard let values = try? volumeURL.resourceValues(forKeys: [
        .volumeTotalCapacityKey,
        .volumeAvailableCapacityForImportantUsageKey
    ]) else {
        throw NSError(domain: "StorageError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to get volume info"])
    }
    
    guard let total = values.volumeTotalCapacity,
          let free = values.volumeAvailableCapacityForImportantUsage else {
        throw NSError(domain: "StorageError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing capacity data"])
    }
    
    let totalInt64 = Int64(total)
    let freeInt64 = Int64(free)
    let usedInt64 = totalInt64 - freeInt64
    
    return StorageInfo(total: totalInt64, used: usedInt64, free: freeInt64)
}
