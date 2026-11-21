import Foundation

/// Large catalogs stay in the native helper, outside Raycast's 100 MB background JavaScript heap.
public struct AutomaticScope {
    struct File: Codable { let path: String; let size: Int64; let modified: Double; var canonicalModified: Double? }
    struct Group: Codable { let root: String; let reason: String; var canonical: String?; var files: [File]; var uncertain: Bool? }
    struct Report: Codable { var version = 1; var updated: String; var restored: [String]; var groups: [Group] }
    let index: URL
    let roots: [String], codeRoots: [String], skipped: [String], codeSkipped: [String]
    let types: Set<String>
    private let fm = FileManager.default
    private var reportURL: URL { index.appendingPathComponent("scope-report.json") }
    private var manifestURL: URL { index.appendingPathComponent("scope-excluded.json") }

    public init(index: URL, roots: [String], codeRoots: [String], skipped: [String], codeSkipped: [String], types: Set<String>) {
        self.index = index; self.roots = roots; self.codeRoots = codeRoots
        self.skipped = skipped; self.codeSkipped = codeSkipped; self.types = types
    }
    private func within(_ path: String, _ root: String) -> Bool { path == root || path.hasPrefix(root + "/") }
    private func parent(_ path: String) -> String { (path as NSString).deletingLastPathComponent }
    private func matches(_ text: String, _ pattern: String) -> Bool { text.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil }
    private func scratch(_ path: String) -> Bool { matches(path, #"(?:^|/)(?:codex-work|worktrees?|next-batches-stage|tmp[^/]*|[^/]*-reference)(?:/|$)"#) }
    private func load() throws -> Report {
        guard fm.fileExists(atPath: reportURL.path) else { return Report(updated: "", restored: [], groups: []) }
        let report = try JSONDecoder().decode(Report.self, from: Data(contentsOf: reportURL))
        guard report.version == 1, report.restored.allSatisfy({ $0.hasPrefix("/") && !$0.contains("\0") }),
              report.groups.allSatisfy({ group in group.root.hasPrefix("/") && !group.root.contains("\0") && group.files.allSatisfy {
                  within($0.path, group.root) && !$0.path.contains("\0") && $0.modified.isFinite && $0.size >= 0
              } }) else { throw CocoaError(.fileReadCorruptFile) }
        return report
    }
    private func git(_ root: String, _ arguments: [String]) throws -> String {
        let process = Process(), pipe = Pipe()
        process.executableURL = URL(fileURLWithPath: FileSystem.git ?? "/usr/bin/git")
        process.arguments = ["--no-optional-locks", "-C", root] + arguments
        process.environment = ProcessInfo.processInfo.environment.merging(["GIT_TERMINAL_PROMPT": "0", "GIT_OPTIONAL_LOCKS": "0"]) { _, new in new }
        process.standardOutput = pipe; process.standardError = FileHandle.nullDevice; process.standardInput = FileHandle.nullDevice
        try process.run()
        let timeout = DispatchWorkItem { if process.isRunning { process.terminate() } }
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 5, execute: timeout)
        defer { timeout.cancel() }
        var data = Data(), overflow = false
        while true {
            let chunk = pipe.fileHandleForReading.readData(ofLength: 32768)
            if chunk.isEmpty { break }
            if data.count + chunk.count > 8 * 1024 * 1024 { overflow = true; if process.isRunning { process.terminate() }; break }
            data.append(chunk)
        }
        process.waitUntilExit()
        guard !overflow, process.terminationStatus == 0 else { throw CocoaError(.fileReadUnknown) }
        return String(decoding: data, as: UTF8.self)
    }
    public func update() throws -> Int {
        var files: [File] = []
        for (name, selected, omitted) in [(IndexStore.mainFile, roots, skipped), (IndexStore.codeFile, codeRoots, codeSkipped)] where !selected.isEmpty {
            guard fm.fileExists(atPath: index.appendingPathComponent(name).path) else { continue }
            let store = try IndexStore(directory: index, file: name)
            try store.db.query("SELECT path FROM files") { row in
                guard let path = row.text(0), FolderSelection.isSearched(path, folders: selected, skipped: omitted),
                      !types.contains((path as NSString).pathExtension.lowercased()),
                      let info = FileSystem.info(of: path), info.isRegular, !info.dataless else { return }
                files.append(File(path: path, size: info.size, modified: info.mtime))
            }
        }
        let report = try analyze(files)
        let encoder = JSONEncoder()
        try encoder.encode(report).write(to: reportURL, options: .atomic)
        let excluded = report.groups.filter { $0.uncertain != true && !report.restored.contains($0.root) }.flatMap { $0.files.map(\.path) }
        try encoder.encode(excluded).write(to: manifestURL, options: .atomic)
        return excluded.count
    }
    func analyze(_ catalog: [File]) throws -> Report {
        let previous = try load()
        var known = Dictionary(catalog.map { ($0.path, $0) }, uniquingKeysWith: { _, new in new })
        for file in previous.groups.flatMap(\.files) where known[file.path] == nil {
            guard FolderSelection.isSearched(file.path, folders: roots + codeRoots, skipped: skipped + codeSkipped),
                  let info = FileSystem.info(of: file.path), info.isRegular, !info.dataless else { continue }
            known[file.path] = File(path: file.path, size: info.size, modified: info.mtime)
        }
        var repoCache: [String: String] = [:]
        func repository(_ path: String) -> String? {
            if let cached = repoCache[path] { return cached.isEmpty ? nil : cached }
            guard codeRoots.contains(where: { within(path, $0) }) else { return nil }
            let up = parent(path)
            let root = fm.fileExists(atPath: path + "/.git") ? path : up != path ? repository(up) : nil
            repoCache[path] = root ?? ""; return root
        }
        func stagedRoot(_ path: String) -> String? {
            var folder = parent(path)
            while codeRoots.contains(where: { within(folder, $0) }) {
                if (folder as NSString).lastPathComponent == "tree", fm.fileExists(atPath: parent(folder) + "/history.bundle"), fm.fileExists(atPath: parent(folder) + "/manifest.json") { return folder }
                let up = parent(folder); if up == folder { break }; folder = up
            }
            return nil
        }
        func snapshotRoot(_ path: String) -> String? {
            let components = path.split(separator: "/").map(String.init)
            guard components.count > 2 else { return nil }
            for i in 0..<(components.count - 1) where matches(components[i], #"^[a-z][\w.-]*-v?\d+\.\d+(?:[.-].*)?$"#) {
                let root = "/" + components[...i].joined(separator: "/")
                if scratch(root), matches(root, #"/(?:local-native|vendor|third.party|reference|[^/]*build)(?:/|$)"#) { return root }
            }
            return nil
        }
        var repos: [String: [File]] = [:], snapshots: [String: [File]] = [:], staged: [String: [File]] = [:]
        for file in known.values where (roots + codeRoots).contains(where: { within(file.path, $0) }) {
            if let repo = repository(parent(file.path)) { repos[repo, default: []].append(file) }
            else if let root = stagedRoot(file.path) { staged[root, default: []].append(file) }
            else if let root = snapshotRoot(file.path) { snapshots[root, default: []].append(file) }
        }
        let old = Dictionary(previous.groups.flatMap(\.files).map { ($0.path, $0) }, uniquingKeysWith: { _, new in new })
        func unchanged(_ root: String, _ canonical: String, _ entries: [File]) -> [File] {
            let sameCanonical = previous.groups.first { $0.root == root }?.canonical == canonical
            return entries.compactMap { file in
                let target = canonical + String(file.path.dropFirst(root.count))
                guard known[target] != nil, let a = FileSystem.info(of: file.path), let b = FileSystem.info(of: target),
                      a.isRegular, b.isRegular, !a.dataless, !b.dataless, a.size == b.size else { return nil }
                let cached = old[file.path]
                let sameVersion = sameCanonical && cached?.size == a.size && cached?.modified == a.mtime && cached?.canonicalModified == b.mtime
                guard sameVersion || fm.contentsEqual(atPath: file.path, andPath: target) else { return nil }
                return File(path: file.path, size: a.size, modified: a.mtime, canonicalModified: b.mtime)
            }
        }
        var origins: [String: [String]] = [:], primary = Set<String>()
        for root in repos.keys {
            guard let raw = try? git(root, ["config", "--get", "remote.origin.url"]).trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else { continue }
            var origin = raw.replacingOccurrences(of: #"\.git$"#, with: "", options: .regularExpression)
            origin = origin.replacingOccurrences(of: #"^git@([^:]+):"#, with: "https://$1/", options: .regularExpression)
            if (try? fm.attributesOfItem(atPath: root + "/.git")[.type] as? FileAttributeType) == .typeDirectory { primary.insert(root) }
            origins[origin, default: []].append(root)
        }
        var groups: [Group] = []
        for var copies in origins.values {
            var owners: [String: Int] = [:]
            for root in copies { for file in repos[root]! { owners[String(file.path.dropFirst(root.count)), default: 0] += 1 } }
            let coverage = Dictionary(uniqueKeysWithValues: copies.map { root in (root, repos[root]!.filter { owners[String($0.path.dropFirst(root.count))]! > 1 }.count) })
            copies.sort {
                if coverage[$0] != coverage[$1] { return coverage[$0]! > coverage[$1]! }
                if primary.contains($0) != primary.contains($1) { return primary.contains($0) }
                if scratch($0) != scratch($1) { return !scratch($0) }
                return $0.count == $1.count ? $0 < $1 : $0.count < $1.count
            }
            let canonical = copies[0]
            for root in copies.dropFirst() { groups.append(Group(root: root, reason: "Unchanged copy of your canonical project; changed and new files stay indexed", canonical: canonical, files: unchanged(root, canonical, repos[root]!))) }
        }
        for (root, entries) in staged {
            let rawSource = (try? JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: parent(root) + "/manifest.json"))) as? [String: Any])?["source"] as? String
            let source = rawSource.flatMap { $0.hasPrefix("/") && !$0.contains("\0") ? $0 : nil }
            let matches = source.map { source in repos.keys.filter { !scratch($0) && ($0 as NSString).lastPathComponent == (source as NSString).lastPathComponent } } ?? []
            let canonical = source.flatMap { repos[$0] != nil ? $0 : matches.count == 1 ? matches[0] : nil }
            if let canonical { groups.append(Group(root: root, reason: "Unchanged files in a staged project export; edits and new files stay indexed", canonical: canonical, files: unchanged(root, canonical, entries))) }
            else { groups.append(Group(root: root, reason: "Staged project has no unambiguous indexed canonical project; kept indexed", files: [], uncertain: true)) }
        }
        let duplicates = Set(groups.flatMap { [$0.root] + ($0.canonical.map { [$0] } ?? []) })
        for (root, files) in repos where !duplicates.contains(root) && scratch(root) && matches(root, #"reference|local-native|vendor|third.party"#) {
            if let tracked = try? git(root, ["ls-files", "-z"]), let changed = try? git(root, ["diff", "HEAD", "--name-only", "-z", "--no-ext-diff", "--no-textconv"]) {
                let kept = Set(tracked.split(separator: "\0").map(String.init)), edited = Set(changed.split(separator: "\0").map(String.init))
                let pristine = files.filter { let path = String($0.path.dropFirst(root.count + 1)); return kept.contains(path) && !edited.contains(path) }
                groups.append(Group(root: root, reason: "Pristine tracked files in a reference checkout; edits and new files stay indexed", files: pristine, uncertain: !matches(root, #"/(?:local-native|[^/]*-reference)(?:/|$)"#)))
            } else { groups.append(Group(root: root, reason: "Reference checkout could not be compared safely; kept indexed", files: [], uncertain: true)) }
        }
        for (root, files) in snapshots {
            let times = Dictionary(grouping: files, by: \.modified)
            let baseline = times.max { $0.value.count < $1.value.count }!
            let confident = files.count >= 150 && Double(baseline.value.count) / Double(files.count) >= 0.95
            groups.append(Group(root: root, reason: confident ? "Versioned build-tool snapshot with a shared archive timestamp; later edits and new files stay indexed" : "Possible tool snapshot without a reliable baseline; kept indexed", files: confident ? baseline.value : [], uncertain: !confident))
        }
        let format = ISO8601DateFormatter(); format.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return Report(updated: format.string(from: Date()), restored: try load().restored, groups: groups)
    }
}
