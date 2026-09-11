import Foundation

public enum ProgressFormatting {
    public static func decimalBytes(_ bytes: Int64) -> String {
        ByteCountFormatter.string(fromByteCount: bytes, countStyle: .decimal)
    }

    public static func binaryBytes(_ bytes: Int64) -> String {
        ByteCountFormatter.string(fromByteCount: bytes, countStyle: .binary)
    }

    public static func percent(_ fraction: Double) -> String {
        String(format: "%.1f%%", fraction * 100)
    }

    public static func speed(_ bytesPerSecond: Double?) -> String {
        guard let bytesPerSecond else {
            return "unknown"
        }

        return "\(ByteCountFormatter.string(fromByteCount: Int64(bytesPerSecond), countStyle: .decimal))/s"
    }

    public static func eta(_ seconds: Double?) -> String {
        guard let seconds, seconds.isFinite, seconds >= 0 else {
            return "unknown"
        }

        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = seconds >= 3600 ? [.hour, .minute] : [.minute, .second]
        formatter.unitsStyle = .abbreviated
        formatter.maximumUnitCount = 2
        return formatter.string(from: seconds) ?? "unknown"
    }
}
