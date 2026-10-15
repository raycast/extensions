// The crawl's file system half: DigUp's Crawler.swift walk with the facts Rules.classify and the crawler's gates need,
// gathered once. Metadata only; file contents are never read. DigUp: Crawler.swift, Rules.swift, Files+Apple.swift.
import Foundation
import UniformTypeIdentifiers

enum Walk {
    /// DigUp: Rules.projectMarkers / projectBundleExtensions. `.git` counts: contentsOfDirectory lists hidden names.
    static let projectMarkers: Set<String> = [
        ".git", "package.json", "Package.swift", "pyproject.toml", "setup.py", "requirements.txt", "Cargo.toml",
        "go.mod", "pom.xml", "build.gradle", "build.gradle.kts", "Gemfile", "composer.json", "CMakeLists.txt",
    ]
    static let projectBundleExtensions: Set<String> = ["xcodeproj", "xcworkspace"]

    /// DigUp: Rules.codeSkippedFolderNames (the code index leaves these folders out).
    static let codeSkippedFolderNames: Set<String> = [
        "vendor", "Vendor", "vendored", "third_party", "third-party", "thirdparty", "3rdparty", "external", "extern",
        "deps", "build", "Build", "dist", "out", "target", "obj", "coverage", "htmlcov", "generated", "__generated__",
        "wandb", "mlruns", "lightning_logs",
    ]

    static let crawlKeys: [URLResourceKey] = [.isDirectoryKey, .isPackageKey, .contentTypeKey, .isUbiquitousItemKey,
                                              .ubiquitousItemDownloadingStatusKey]
    static let screenCaptureAttribute = "com.apple.metadata:kMDItemIsScreenCapture"
    static let datalessFlag: UInt32 = 0x4000_0000   // SF_DATALESS

    struct Rules {
        let names: Set<String>
        let suffixes: [String]
        let excluded: [String]
        let libraryPath: String
        let code: Bool

        /// DigUp: Rules.skipReason(forFolder:), then Rules.codeSkipReason(forFolder:) for the code index.
        func skipReason(_ url: URL) -> String? {
            let name = url.lastPathComponent
            let path = url.path
            if names.contains(name) { return "developer folder" }
            if suffixes.contains(where: { name.hasSuffix($0) }) { return ".noindex folder" }
            if path == libraryPath { return "~/Library" }
            if excluded.contains(where: { path == $0 || path.hasPrefix($0 + "/") }) { return "excluded folder" }
            guard code else { return nil }
            if Walk.codeSkippedFolderNames.contains(name) { return "vendored or built code" }
            // A submodule or a worktree (".git" is a file there): someone else's code, or a copy of a repo's own.
            if Walk.gitKind(path) == "file" { return "submodule or worktree" }
            return nil
        }
    }

    static func run(_ a: Args) throws -> JSON {
        let home = try a.string("home")
        let code = a.bool("code")
        let names = Set(a.strings("skipNames")), suffixes = a.strings("skipSuffixes"), excluded = a.strings("excluded")
        var files: [JSON] = [], dirs: [JSON] = []
        var skipped: [String: Int] = [:]
        var seenFiles = Set<String>(), seenDirs = Set<String>()   // a folder inside another root is walked twice

        func note(directory path: String) {
            guard seenDirs.insert(path).inserted else { return }
            let git = gitKind(path)
            let project = !code && isProjectRoot(path)
            if project || git != nil {
                dirs.append(["path": .string(path), "projectRoot": .bool(project), "gitDir": .optional(git)])
            }
        }

        for rootPath in a.strings("roots") {
            let root = URL(fileURLWithPath: rootPath).standardizedFileURL
            // DigUp: Crawler.crawl. Only exclusions inside this root apply (a folder chosen inside an excluded one is
            // walked whole), each also by its real path: the walk reports /private/var where the root says /var.
            let real = realPath(root.path)
            let skips = excluded.filter { isInside($0, root.path) || isInside($0, real) }.flatMap { [$0, realPath($0)] }
            let rules = Rules(names: names, suffixes: suffixes, excluded: skips, libraryPath: home + "/Library",
                              code: code)
            // The enumerator never yields the root, so skip rules apply to what is below it only.
            note(directory: root.path)
            guard let walker = FileManager.default.enumerator(
                at: root, includingPropertiesForKeys: crawlKeys, options: [.skipsHiddenFiles, .skipsPackageDescendants],
                errorHandler: { _, _ in true }) else { continue }

            func visit(_ url: URL) {
                let values = try? url.resourceValues(forKeys: Set(crawlKeys))
                let isPackage = values?.isPackage == true
                if values?.isDirectory == true, !isPackage {
                    if let reason = rules.skipReason(url) {
                        walker.skipDescendants()
                        skipped[reason, default: 0] += 1
                    } else {
                        note(directory: url.path)
                    }
                    return
                }
                if isPackage {
                    walker.skipDescendants()   // macOS's enumerator never enters one
                    skipped["app or bundle", default: 0] += 1
                    return
                }
                guard seenFiles.insert(url.path).inserted else { return }
                files.append(fileEntry(url, values))
            }

            // URL resource values are autoreleased; draining per entry keeps a big walk from piling them up.
            while let url = autoreleasepool(invoking: { walker.nextObject() as? URL }) {
                autoreleasepool { visit(url) }
            }
        }
        return ["files": .array(files), "dirs": .array(dirs), "skipped": .object(skipped.mapValues { .int($0) })]
    }

    /// One file's facts: lstat (never follows a link), the placeholder flags, and the kind of file.
    private static func fileEntry(_ url: URL, _ values: URLResourceValues?) -> JSON {
        let path = url.path
        var info = stat()
        let found = lstat(path, &info) == 0
        let type = typeName(values?.contentType)
        let inCloud = values?.isUbiquitousItem == true && values?.ubiquitousItemDownloadingStatus != .current
        let marked = type == "image" && getxattr(path, screenCaptureAttribute, nil, 0, 0, 0) > 0
        return [
            "path": .string(path),
            "size": .int(found ? Int(info.st_size) : 0),
            "mtime": .double(found ? Double(info.st_mtimespec.tv_sec) + Double(info.st_mtimespec.tv_nsec) / 1e9 : 0),
            "inode": .int(found ? Int(truncatingIfNeeded: info.st_ino) : 0),
            "device": .int(found ? Int(info.st_dev) : 0),
            "regular": .bool(found && (info.st_mode & S_IFMT) == S_IFREG),
            "dataless": .bool(found && info.st_flags & datalessFlag != 0),
            "inCloud": .bool(inCloud),
            "type": .optional(type),
            "screenshotMarker": .bool(marked),
        ]
    }

    /// DigUp: Files+Apple.swift:21-27, in its order.
    private static func typeName(_ type: UTType?) -> String? {
        guard let type else { return nil }
        if type.conforms(to: .sourceCode) || type.conforms(to: .script) { return "sourceCode" }
        if type.conforms(to: .pdf) { return "pdf" }
        if type.conforms(to: .image) { return "image" }
        if type.conforms(to: .movie) { return "movie" }
        if type.conforms(to: .audio) { return "audio" }
        return nil
    }

    /// "dir" when `.git` is a folder, "file" when it is a file (a submodule or worktree), else nil.
    static func gitKind(_ folder: String) -> String? {
        var isFolder: ObjCBool = false
        guard FileManager.default.fileExists(atPath: folder + "/.git", isDirectory: &isFolder) else { return nil }
        return isFolder.boolValue ? "dir" : "file"
    }

    /// DigUp: Rules.isProjectRoot.
    static func isProjectRoot(_ folder: String) -> Bool {
        guard let names = try? FileManager.default.contentsOfDirectory(atPath: folder) else { return false }
        return names.contains { projectMarkers.contains($0) || projectBundleExtensions.contains(($0 as NSString).pathExtension) }
    }

    /// DigUp: FolderSelection.isInside (strictly below `folder`).
    static func isInside(_ path: String, _ folder: String) -> Bool {
        path.hasPrefix(folder.hasSuffix("/") ? folder : folder + "/")
    }

    static func realPath(_ path: String) -> String {
        var buffer = [Int8](repeating: 0, count: Int(PATH_MAX))
        guard realpath(path, &buffer) != nil else { return path }
        return String(cString: buffer)
    }
}
