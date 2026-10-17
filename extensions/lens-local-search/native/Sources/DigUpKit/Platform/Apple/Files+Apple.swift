// File kinds, the file system and metadata on macOS: Uniform Type Identifiers, the screenshot xattr, iCloud placeholders,
// Spotlight's page counts and durations. Platform/Portable has the same names for Linux and Windows.
#if canImport(UniformTypeIdentifiers)
import CoreGraphics
import CoreServices
import Foundation
import UniformTypeIdentifiers

extension Rules {
    public static func classify(_ url: URL, type: UTType?, options: IndexOptions) -> Classification {
        let ext = url.pathExtension.lowercased()
        if options.excludedExtensions.contains(ext) { return .skip("excluded type") }
        // .ts / .mts are usually TypeScript, which Spotlight calls MPEG-2 video. Only a real transport stream is video.
        if ext == "ts" || ext == "mts" || ext == "m2ts" {
            if isMPEGTransportStream(url) { return .index(.video) }
            return options.includeCode ? .index(.doc) : .skip("code or data file")
        }
        if docExtensions.contains(ext) { return .index(.doc) }
        if codeExtensions.contains(ext) { return options.includeCode ? .index(.doc) : .skip("code or data file") }
        guard let type else { return .ignore }
        if type.conforms(to: .sourceCode) || type.conforms(to: .script) {
            return options.includeCode ? .index(.doc) : .skip("code or data file")
        }
        if type.conforms(to: .pdf) { return .index(.pdf) }
        if type.conforms(to: .image) { return .index(isScreenshot(url) ? .screenshot : .image) }
        if type.conforms(to: .movie) { return .index(.video) }
        if type.conforms(to: .audio) { return .index(.audio) }
        return .ignore
    }

    /// What the crawl asks, with the type among the file's resource values.
    static func classify(_ url: URL, values: URLResourceValues?, options: IndexOptions) -> Classification {
        classify(url, type: values?.contentType, options: options)
    }

    /// macOS's screenshot marker, an extended attribute that survives moves and copies.
    static func hasScreenshotMarker(_ url: URL) -> Bool {
        getxattr(url.path, "com.apple.metadata:kMDItemIsScreenCapture", nil, 0, 0, 0) > 0
    }
}

enum FileSystem {
    /// What the crawl asks of each URL.
    // Cloud-status keys make a synchronous File Provider request per file; lstat's SF_DATALESS handles placeholders.
    static let crawlKeys: [URLResourceKey] = [.isDirectoryKey, .isPackageKey, .contentTypeKey]

    /// An app, a framework, a library bundle: one thing to the Finder, skipped whole.
    static func isPackage(_ url: URL, _ values: URLResourceValues?) -> Bool {
        values?.isPackage == true
    }

    /// An iCloud file that isn't downloaded (reading it would download it).
    static func isInCloud(_ values: URLResourceValues?) -> Bool {
        values?.isUbiquitousItem == true && values?.ubiquitousItemDownloadingStatus != .current
    }

    /// The file's own facts, without following a link. `dataless`: a placeholder ("Optimize Mac Storage", File Providers)
    /// whose contents would be downloaded on read.
    static func info(of path: String) -> FileInfo? {
        var info = stat()
        guard lstat(path, &info) == 0 else { return nil }
        return FileInfo(isRegular: (info.st_mode & S_IFMT) == S_IFREG, size: Int64(info.st_size),
                        mtime: Double(info.st_mtimespec.tv_sec) + Double(info.st_mtimespec.tv_nsec) / 1e9,
                        inode: UInt64(info.st_ino), device: UInt64(bitPattern: Int64(info.st_dev)),
                        dataless: info.st_flags & 0x4000_0000 != 0)   // SF_DATALESS
    }

    /// A git that's really installed (Xcode's, the command line tools', Homebrew's). /usr/bin/git on a Mac without the
    /// developer tools only asks to install them.
    static let git: String? = {
        var candidates: [String] = []
        if let developer = try? FileManager.default.destinationOfSymbolicLink(atPath: "/var/db/xcode_select_link") {
            candidates.append(developer + "/usr/bin/git")
        }
        candidates += ["/Library/Developer/CommandLineTools/usr/bin/git",
                       "/Applications/Xcode.app/Contents/Developer/usr/bin/git", "/opt/homebrew/bin/git",
                       "/usr/local/bin/git"]
        return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
    }()
}

extension Estimator {
    static func pages(of path: String) -> Int {
        if let pages = spotlight(path, kMDItemNumberOfPages), pages > 0 { return Int(pages) }
        return CGPDFDocument(URL(fileURLWithPath: path) as CFURL)?.numberOfPages ?? 1
    }

    static func duration(of path: String) -> Double {
        if let seconds = spotlight(path, kMDItemDurationSeconds), seconds > 0 { return seconds }
        return MediaInfo.duration(of: URL(fileURLWithPath: path)) ?? 0
    }

    private static func spotlight(_ path: String, _ attribute: CFString) -> Double? {
        guard let item = MDItemCreate(kCFAllocatorDefault, path as CFString) else { return nil }
        return (MDItemCopyAttribute(item, attribute) as? NSNumber)?.doubleValue
    }
}
#endif
