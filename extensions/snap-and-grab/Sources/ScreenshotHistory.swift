import Foundation

func recentScreenshotFiles(in folder: URL, excluding current: URL?, screenshotPrefix: String) throws -> [URL] {
    let keys: Set<URLResourceKey> = [.isRegularFileKey, .contentModificationDateKey, .creationDateKey]
    let urls = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: Array(keys), options: [.skipsHiddenFiles])
    let imageExtensions: Set<String> = ["png", "jpg", "jpeg", "heic", "tif", "tiff"]
    let dedicated = folder.lastPathComponent.lowercased().contains("screenshot")
    let excluded = current?.resolvingSymlinksInPath().standardizedFileURL
    let candidates: [(URL, Date)] = urls.compactMap { url in
        guard imageExtensions.contains(url.pathExtension.lowercased()), url.resolvingSymlinksInPath().standardizedFileURL != excluded else { return nil }
        guard dedicated || url.lastPathComponent.hasPrefix(screenshotPrefix) || url.lastPathComponent.hasPrefix("Screenshot") else { return nil }
        guard let values = try? url.resourceValues(forKeys: keys), values.isRegularFile == true else { return nil }
        return (url, values.contentModificationDate ?? values.creationDate ?? .distantPast)
    }
    return candidates.sorted {
        if $0.1 != $1.1 { return $0.1 > $1.1 }
        return $0.0.lastPathComponent > $1.0.lastPathComponent
    }.map { $0.0 }
}
