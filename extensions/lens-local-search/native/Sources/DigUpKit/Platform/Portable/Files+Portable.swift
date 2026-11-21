// File kinds and the file system on Linux and Windows: by extension and POSIX calls, where macOS has Uniform Type
// Identifiers, the screenshot xattr and iCloud placeholders (Platform/Apple).
#if !canImport(UniformTypeIdentifiers)
import Foundation
#if canImport(Glibc)
import Glibc
#elseif os(Windows)
import WinSDK
#endif

extension Rules {
    /// What macOS gets from the type system, as extension sets. RAW pictures, which nothing here decodes yet, are still
    /// images: they fail with a note that says so, rather than vanish.
    static let imageExtensions: Set<String> = [
        "jpg", "jpeg", "jpe", "jfif", "png", "gif", "bmp", "tif", "tiff", "webp", "heic", "heif", "avif", "psd", "tga",
        "pnm", "ppm", "pgm", "cr2", "nef", "arw", "dng", "raf", "orf", "rw2",
    ]
    static let audioExtensions: Set<String> = [
        "mp3", "m4a", "m4b", "aac", "wav", "wave", "flac", "ogg", "oga", "opus", "aiff", "aif", "wma", "amr", "caf", "mka",
    ]
    static let videoExtensions: Set<String> = [
        "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp", "3g2", "mpg", "mpeg", "m2v", "ogv", "mxf",
    ]

    /// `classify` as on macOS, by extension (for files with one, macOS's types come from the extension too).
    static func classify(_ url: URL, values: URLResourceValues?, options: IndexOptions) -> Classification {
        let ext = url.pathExtension.lowercased()
        if options.excludedExtensions.contains(ext) { return .skip("excluded type") }
        // .ts / .mts are usually TypeScript. Only a real transport stream is video.
        if ext == "ts" || ext == "mts" || ext == "m2ts" {
            if isMPEGTransportStream(url) { return .index(.video) }
            return options.includeCode ? .index(.doc) : .skip("code or data file")
        }
        if docExtensions.contains(ext) { return .index(.doc) }
        if codeExtensions.contains(ext) || sourceExtensions.contains(ext) {
            return options.includeCode ? .index(.doc) : .skip("code or data file")
        }
        if ext == "pdf" { return .index(.pdf) }
        if imageExtensions.contains(ext) { return .index(isScreenshot(url) ? .screenshot : .image) }
        if videoExtensions.contains(ext) { return .index(.video) }
        if audioExtensions.contains(ext) { return .index(.audio) }
        return .ignore
    }

    /// Only macOS marks screenshots; elsewhere their names tell (`screenshotPrefixes` covers Snipping Tool, Win+PrtScn,
    /// GNOME and KDE: they all start with "Screenshot").
    static func hasScreenshotMarker(_ url: URL) -> Bool { false }
}

enum FileSystem {
    /// What the crawl asks of each URL.
    static let crawlKeys: [URLResourceKey] = [.isDirectoryKey, .isPackageKey]

    /// Mac bundles that may sit on a shared or copied disk (an app, a Photos library): skipped whole here too, by name,
    /// since nothing else knows them as one thing.
    static let packageExtensions: Set<String> = [
        "app", "framework", "bundle", "plugin", "appex", "xpc", "kext", "xcodeproj", "xcworkspace", "playground",
        "photoslibrary", "musiclibrary", "tvlibrary", "imovielibrary", "fcpbundle", "logicx", "band", "pkg", "dmg",
    ]
    static func isPackage(_ url: URL, _ values: URLResourceValues?) -> Bool {
        url.hasDirectoryPath && packageExtensions.contains(url.pathExtension.lowercased())
    }

    /// No iCloud here. (OneDrive's Files On-Demand placeholders are a file attribute: `info`, on Windows.)
    static func isInCloud(_ values: URLResourceValues?) -> Bool { false }

    #if os(Windows)
    /// The file's own facts, without following a link. OneDrive's Files On-Demand placeholders are `dataless` (their
    /// attributes say the contents would be downloaded on read, or on open), and they're never opened here.
    static func info(of path: String) -> FileInfo? {
        let native = path.replacingOccurrences(of: "/", with: "\\")
        var found = WIN32_FIND_DATAW()
        let search = native.withCString(encodedAs: UTF16.self) {
            FindFirstFileExW($0, FindExInfoBasic, &found, FindExSearchNameMatch, nil, 0)
        }
        guard let search, search != INVALID_HANDLE_VALUE else { return nil }
        FindClose(search)
        let attributes = found.dwFileAttributes
        let symlink: DWORD = 0xA000_000C, junction: DWORD = 0xA000_0003   // IO_REPARSE_TAG_SYMLINK, _MOUNT_POINT
        let link = attributes & DWORD(FILE_ATTRIBUTE_REPARSE_POINT) != 0
            && (found.dwReserved0 == symlink || found.dwReserved0 == junction)
        let isRegular = attributes & DWORD(FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_DEVICE) == 0 && !link
        // FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS, FILE_ATTRIBUTE_RECALL_ON_OPEN, FILE_ATTRIBUTE_OFFLINE
        let dataless = attributes & (0x0040_0000 | 0x0004_0000 | DWORD(FILE_ATTRIBUTE_OFFLINE)) != 0
        let ticks = UInt64(found.ftLastWriteTime.dwHighDateTime) << 32 | UInt64(found.ftLastWriteTime.dwLowDateTime)
        // The file's id on its volume stands in for the inode: it's what lets a moved file keep its vectors.
        var (inode, device): (UInt64, UInt64) = (0, 0)
        if isRegular, !dataless {
            let handle = native.withCString(encodedAs: UTF16.self) {
                CreateFileW($0, 0, DWORD(FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE), nil,
                            DWORD(OPEN_EXISTING), DWORD(FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT), nil)
            }
            if let handle, handle != INVALID_HANDLE_VALUE {
                var file = BY_HANDLE_FILE_INFORMATION()
                if GetFileInformationByHandle(handle, &file) {
                    inode = UInt64(file.nFileIndexHigh) << 32 | UInt64(file.nFileIndexLow)
                    device = UInt64(file.dwVolumeSerialNumber)
                }
                CloseHandle(handle)
            }
        }
        return FileInfo(isRegular: isRegular, size: Int64(found.nFileSizeHigh) << 32 | Int64(found.nFileSizeLow),
                        mtime: (Double(ticks) - 116_444_736_000_000_000) / 10_000_000,   // from 1601, in 100 ns
                        inode: inode, device: device, dataless: dataless)
    }
    #else
    /// The file's own facts, without following a link.
    static func info(of path: String) -> FileInfo? {
        var info = stat()
        guard lstat(path, &info) == 0 else { return nil }
        return FileInfo(isRegular: (UInt32(info.st_mode) & UInt32(S_IFMT)) == UInt32(S_IFREG),
                        size: Int64(info.st_size),
                        mtime: Double(info.st_mtim.tv_sec) + Double(info.st_mtim.tv_nsec) / 1e9,
                        inode: UInt64(info.st_ino), device: UInt64(info.st_dev), dataless: false)
    }
    #endif

    #if os(Windows)
    /// The crawl's walk of a folder. Foundation's enumerator on Windows skips the wrong folder's contents after
    /// `skipDescendants()` (2026-10-11, Swift 6.4: skipping one folder emptied a sibling that came before it), so the walk
    /// is `DirectoryWalk` here.
    static func walk(_ root: URL, keys: [URLResourceKey]) -> DirectoryWalk? { DirectoryWalk(root, keys: keys) }
    #endif

    /// git on PATH; none → everything in a folder counts, as on a Mac without it.
    static let git: String? = executable("git")

    /// A program's file name here: "ffmpeg.exe" on Windows.
    static func program(_ name: String) -> String {
        #if os(Windows)
        return name + ".exe"
        #else
        return name
        #endif
    }

    /// `name` on PATH.
    static func executable(_ name: String) -> String? {
        #if os(Windows)
        // Windows calls it "Path", and names are case-insensitive.
        let path = ProcessInfo.processInfo.environment.first { $0.key.uppercased() == "PATH" }?.value ?? ""
        let separator: Character = ";"
        #else
        let path = ProcessInfo.processInfo.environment["PATH"] ?? "/usr/local/bin:/usr/bin:/bin"
        let separator: Character = ":"
        #endif
        for folder in path.split(separator: separator) where !folder.isEmpty {
            let candidate = "\(folder)/\(program(name))"
            if FileManager.default.isExecutableFile(atPath: candidate) { return candidate }
        }
        return nil
    }
}

#if os(Windows)
/// A depth-first walk with FileManager's enumerator's shape (`nextObject`, `skipDescendants`), where skipping leaves out
/// exactly the folder just returned. Hidden files (the attribute, or a name starting with a dot, as on a Mac) are left
/// out, and folders that can't be read are passed over.
final class DirectoryWalk {
    private let keys: [URLResourceKey]
    private var pending: [URL]   // what's next, last first
    private var opened: URL?     // the folder just returned: its contents come next, unless skipped

    init(_ root: URL, keys: [URLResourceKey]) {
        self.keys = keys
        pending = []
        pending = contents(of: root).reversed()
    }

    func nextObject() -> Any? {
        if let folder = opened {
            pending += contents(of: folder).reversed()
            opened = nil
        }
        guard let next = pending.popLast() else { return nil }
        if (try? next.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true { opened = next }
        return next
    }

    func skipDescendants() { opened = nil }

    private func contents(of folder: URL) -> [URL] {
        let found = (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: keys,
                                                                  options: [.skipsHiddenFiles])) ?? []
        return found.filter { !$0.lastPathComponent.hasPrefix(".") }
    }
}
#endif
#endif
