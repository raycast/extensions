import Foundation
#if canImport(Darwin)
import Darwin
#endif

public enum Classification: Equatable, Sendable {
    case index(FileKind)
    case skip(String)   // a reason worth reporting ("code or data file")
    case ignore         // a type we don't handle at all
}

/// What gets indexed. The defaults come from a real developer's Mac: Spotlight types 57k TypeScript files as movies,
/// one repo holds a 55k-clip dataset, and screenshot tools move screenshots into code projects.
public enum Rules {
    /// Folders never worth walking into. Hidden folders and bundles are skipped by the enumerator itself.
    static let skippedFolderNames: Set<String> = [
        "node_modules", "bower_components", "venv", "site-packages", "__pycache__", "DerivedData", "Pods", "Carthage",
    ]

    /// Any of these in a folder makes it a code project, where only screenshots are indexed.
    static let projectMarkers = [
        ".git", "package.json", "Package.swift", "pyproject.toml", "setup.py", "requirements.txt", "Cargo.toml",
        "go.mod", "pom.xml", "build.gradle", "build.gradle.kts", "Gemfile", "composer.json", "CMakeLists.txt",
    ]
    static let projectBundleExtensions: Set<String> = ["xcodeproj", "xcworkspace"]

    static let docExtensions: Set<String> = ["txt", "text", "md", "markdown", "rtf", "docx", "doc", "odt", "html", "htm"]

    /// Source code and data files: off by default (your editor and ripgrep search them better, and they flood an index).
    static let codeExtensions: Set<String> = [
        "py", "ipynb", "c", "h", "cc", "cpp", "cxx", "hpp", "hh", "m", "mm", "swift", "tsx", "cts", "js", "jsx", "mjs",
        "cjs", "go", "rs", "java", "kt", "kts", "scala", "rb", "php", "cs", "fs", "sh", "bash", "zsh", "fish", "ps1",
        "lua", "pl", "r", "jl", "dart", "sql", "vue", "svelte", "css", "scss", "sass", "less", "json", "jsonl", "yaml",
        "yml", "toml", "xml", "plist", "gradle", "cmake", "mk", "lock", "log", "csv", "tsv", "ini", "cfg", "conf",
        "proto", "graphql", "tf", "nix", "zig", "hs", "ex", "exs", "erl", "clj", "elm", "ml", "vim", "el", "asm",
        "metal", "glsl", "hlsl", "wgsl", "cu", "pyi", "pyc",
    ]

    static let screenshotPrefixes = ["Screenshot", "Screen Shot", "CleanShot", "SCR-"]

    // MARK: Code (the code index, `IndexOptions.code`)

    /// Source files code search reads.
    static let sourceExtensions: Set<String> = [
        "py", "pyi", "pyx", "c", "h", "cc", "cpp", "cxx", "hpp", "hh", "hxx", "m", "mm", "swift", "ts", "tsx", "mts",
        "cts", "js", "jsx", "mjs", "cjs", "go", "rs", "java", "kt", "kts", "scala", "groovy", "rb", "php", "cs", "fs",
        "sh", "bash", "zsh", "fish", "ps1", "lua", "pl", "pm", "r", "jl", "dart", "sql", "vue", "svelte", "astro",
        "html", "htm", "css", "scss", "sass", "less", "gradle", "cmake", "mk", "proto", "graphql", "gql", "tf", "hcl",
        "nix", "zig", "hs", "ex", "exs", "erl", "clj", "cljs", "elm", "ml", "mli", "vim", "el", "lisp", "asm", "s",
        "metal", "glsl", "hlsl", "wgsl", "cu", "cuh", "ino", "v", "sv", "tex",
    ]
    /// What goes with code: a repo's docs and its settings.
    static let codeTextExtensions: Set<String> = ["md", "markdown", "rst", "adoc", "org", "txt", "yaml", "yml", "toml"]
    /// Code known by its name alone.
    static let codeFileNames: Set<String> = [
        "Makefile", "makefile", "GNUmakefile", "Dockerfile", "Containerfile", "Justfile", "justfile", "Rakefile",
        "Gemfile", "Podfile", "Brewfile", "Procfile", "Vagrantfile", "Jenkinsfile",
    ]
    /// Folders code search doesn't go into, besides what git ignores: other people's code kept in a repo (vendor/,
    /// third_party/), what builds and runs leave (build/, dist/, a wandb run's copy of the code), for repos whose
    /// .gitignore doesn't list them and folders that aren't in git at all.
    static let codeSkippedFolderNames: Set<String> = [
        "vendor", "Vendor", "vendored", "third_party", "third-party", "thirdparty", "3rdparty", "external", "extern",
        "deps", "build", "Build", "dist", "out", "target", "obj", "coverage", "htmlcov", "generated", "__generated__",
        "wandb", "mlruns", "lightning_logs",
    ]

    /// What code search reads in the code folders: source files, a repo's docs and settings, and notebooks. Never data
    /// (json, csv, lockfiles, logs), minified bundles, licenses, or anything that looks like a key or a password file.
    public static func classifyCode(_ url: URL, options: IndexOptions) -> Classification {
        let name = url.lastPathComponent
        let ext = url.pathExtension.lowercased()
        if options.excludedExtensions.contains(ext) { return .skip("excluded type") }
        if isSecret(name) { return .skip("key or password file") }
        let lower = name.lowercased()
        if lower.hasSuffix(".min.js") || lower.hasSuffix(".min.mjs") || lower.hasSuffix(".min.css") {
            return .skip("minified")
        }
        if ["license", "licence", "copying", "notice"].contains(where: lower.hasPrefix) { return .skip("license") }
        if (ext == "ts" || ext == "mts"), isMPEGTransportStream(url) { return .ignore }   // a video
        if sourceExtensions.contains(ext) || codeTextExtensions.contains(ext) || ext == "ipynb"
            || codeFileNames.contains(name) || name.hasPrefix("Dockerfile") {
            return .index(.code)
        }
        if codeExtensions.contains(ext) { return .skip("data file") }   // json, csv, lockfiles, logs, plists
        return .ignore
    }

    /// Keys, certificates, password and credential files: never read, wherever they are.
    static func isSecret(_ name: String) -> Bool {
        let lower = name.lowercased()
        let secretTypes: Set<String> = ["pem", "key", "p12", "pfx", "keystore", "jks", "ppk", "kdbx", "gpg", "asc",
                                        "crt", "cer", "der", "p8", "mobileprovision"]
        if secretTypes.contains((lower as NSString).pathExtension) { return true }
        return ["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", ".env", "secret", "credential", ".netrc", ".npmrc",
                ".pypirc", "htpasswd", ".htpasswd"].contains(where: lower.hasPrefix)
    }

    /// Why code search doesn't go into a folder (`codeSkippedFolderNames`), or nil.
    static func codeSkipReason(forFolder url: URL) -> String? {
        if codeSkippedFolderNames.contains(url.lastPathComponent) { return "vendored or built code" }
        return nil
    }

    /// MPEG-TS packets start with 0x47 every 188 bytes (or every 192 with a 4-byte timecode, as in .m2ts / AVCHD .mts).
    static func isMPEGTransportStream(_ url: URL) -> Bool {
        guard let info = FileSystem.info(of: url.path), info.isRegular, !info.dataless, info.size >= 400 else { return false }
        #if canImport(Darwin)
        let descriptor = open(url.path, O_RDONLY | O_NONBLOCK | O_NOFOLLOW)
        guard descriptor >= 0 else { return false }
        defer { close(descriptor) }
        var bytes = [UInt8](repeating: 0, count: 600)
        guard bytes.withUnsafeMutableBytes({ read(descriptor, $0.baseAddress, $0.count) }) >= 400 else { return false }
        #else
        guard let handle = try? FileHandle(forReadingFrom: url) else { return false }
        defer { try? handle.close() }
        guard let data = try? handle.read(upToCount: 600), data.count >= 400 else { return false }
        let bytes = [UInt8](data)
        #endif
        return (bytes[0] == 0x47 && bytes[188] == 0x47 && bytes[376] == 0x47)
            || (bytes[4] == 0x47 && bytes[196] == 0x47 && bytes[388] == 0x47)
    }

    /// macOS marks screenshots with an extended attribute that survives moves and copies (`hasScreenshotMarker`); names
    /// are the fallback, and all there is elsewhere.
    public static func isScreenshot(_ url: URL) -> Bool {
        if hasScreenshotMarker(url) { return true }
        let name = url.lastPathComponent
        return screenshotPrefixes.contains { name.hasPrefix($0) }
    }

    /// Whether a change the folder watcher reports at `path` is where the crawl of `root` goes: not inside a folder it
    /// skips (hidden, .noindex and developer folders, ~/Library, the skipped ones). A change anywhere else asks for a
    /// sync that finds nothing new. With the home folder chosen, that's DigUp's own writes too: its index and its log
    /// live under ~/Library, and the log line about a change is a change again.
    public static func isWalked(_ path: String, root: String, home: String, excluded: [String]) -> Bool {
        guard path == root || FolderSelection.isInside(path, root) else { return false }
        var folder = root
        for part in path.dropFirst(root.count).split(separator: "/") {
            folder += "/" + part
            if part.hasPrefix(".")
                || skipReason(forFolder: URL(fileURLWithPath: folder), home: home, excluded: excluded) != nil {
                return false
            }
        }
        return true
    }

    static func skipReason(forFolder url: URL, home: String, excluded: [String]) -> String? {
        let name = url.lastPathComponent
        if skippedFolderNames.contains(name) { return "developer folder" }
        if name.hasSuffix(".noindex") { return ".noindex folder" }
        if url.path == home + "/Library" { return "~/Library" }
        if excluded.contains(where: { url.path == $0 || url.path.hasPrefix($0 + "/") }) { return "excluded folder" }
        if isCacheDirectory(url) { return "declared cache directory" }
        return nil
    }

    /// The standard cache tag also covers build caches with arbitrary custom folder names.
    private static func isCacheDirectory(_ folder: URL) -> Bool {
        let path = folder.appendingPathComponent("CACHEDIR.TAG").path
        let signature = Array("Signature: 8a477f597d28d172789f06886806bc55".utf8)
        guard let info = FileSystem.info(of: path), info.isRegular, !info.dataless, info.size >= signature.count else { return false }
        #if canImport(Darwin)
        let fd = open(path, O_RDONLY | O_NONBLOCK | O_NOFOLLOW)
        guard fd >= 0 else { return false }
        defer { close(fd) }
        var bytes = [UInt8](repeating: 0, count: signature.count)
        guard bytes.withUnsafeMutableBytes({ read(fd, $0.baseAddress, $0.count) }) == signature.count else { return false }
        return bytes == signature
        #else
        guard let handle = try? FileHandle(forReadingFrom: URL(fileURLWithPath: path)) else { return false }
        defer { try? handle.close() }
        return (try? handle.read(upToCount: signature.count)) == Data(signature)
        #endif
    }

    static func isProjectRoot(_ folder: String) -> Bool {
        guard let names = try? FileManager.default.contentsOfDirectory(atPath: folder) else { return false }
        let set = Set(names)
        return projectMarkers.contains(where: set.contains)
            || names.contains { projectBundleExtensions.contains(($0 as NSString).pathExtension) }
    }

    static let cameraPrefixes = ["img", "dsc", "pxl", "mvimg", "vid", "gopr", "dji", "photo", "whatsapp", "screenshot"]

    /// Machine-made names like "clip_000123", "frame-0042" or "3f9a1c0e-…", but not camera names like "IMG_1234".
    public static func looksMachineNamed(_ stem: String) -> Bool {
        let name = stem.lowercased()
        if cameraPrefixes.contains(where: { name.hasPrefix($0) }) { return false }
        if name.range(of: #"^[0-9a-f]{8,}([-_][0-9a-f]{4,})*$"#, options: .regularExpression) != nil { return true }
        return name.range(of: #"^[a-z]{0,16}[-_. ]?\d{3,}([-_.]\d+)*$"#, options: .regularExpression) != nil
    }

    /// Folders with hundreds of same-kind, machine-named media files: training data, not your stuff.
    /// They're skipped (and reported) instead of being indexed silently. Roots you pick yourself are never datasets.
    static func datasetFolders(_ files: [(folder: String, stem: String, kind: FileKind)], roots: Set<String>,
                               minimum: Int = 300) -> [String: Int] {
        var groups: [String: [String]] = [:]
        for file in files where [.image, .audio, .video].contains(file.kind) && !roots.contains(file.folder) {
            groups["\(file.folder)\u{0}\(file.kind.rawValue)", default: []].append(file.stem)
        }
        var datasets: [String: Int] = [:]
        for (key, stems) in groups where stems.count >= minimum {
            let machine = stems.filter(looksMachineNamed).count
            if Double(machine) / Double(stems.count) >= 0.7 {
                datasets[String(key.split(separator: "\u{0}")[0]), default: 0] += stems.count
            }
        }
        return datasets
    }
}
