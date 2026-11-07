import Foundation
import Darwin
import UniformTypeIdentifiers

struct FinderTag: Codable, Equatable {
    let name: String
    let color: Int
}

struct TaggedFile: Codable {
    let path: String
    let name: String
    let tags: [FinderTag]
    let kind: String
    let contentTypes: [String]
    let size: Int
    let modifiedAt: String?
    let changed: Bool
}

struct FileFailure: Codable {
    let path: String
    let message: String
}

struct FileBatch: Codable {
    var files: [TaggedFile] = []
    var failures: [FileFailure] = []
}

struct TagCatalog: Codable {
    let tags: [FinderTag]
    let warnings: [String]
}

enum TagOperation {
    case read
    case add([String])
    case remove([String])
    case set([String])
    case rename(String, String)
}

enum TagStoreError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self { case .message(let text): return text }
    }
}

let tagAttribute = "com.apple.metadata:_kMDItemUserTags"
let finderInfoAttribute = "com.apple.FinderInfo"

func tagKey(_ name: String) -> String {
    name.precomposedStringWithCanonicalMapping.lowercased()
}

func validateTagNames(_ names: [String]) throws {
    for name in names {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !name.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
              name.utf8.count <= 255 else {
            throw TagStoreError.message("Tag names must contain 1–255 UTF-8 bytes and no control characters.")
        }
    }
}

func decodeTag(_ raw: String) -> FinderTag {
    if let separator = raw.lastIndex(of: "\n"),
       let color = Int(raw[raw.index(after: separator)...]), (0...7).contains(color) {
        return FinderTag(name: String(raw[..<separator]), color: color)
    }
    return FinderTag(name: raw, color: 0)
}

func readAttribute(_ name: String, path: String, descriptor: Int32? = nil) throws -> Data? {
    let length = descriptor.map { fgetxattr($0, name, nil, 0, 0, 0) } ?? getxattr(path, name, nil, 0, 0, XATTR_NOFOLLOW)
    if length < 0 {
        if errno == ENOATTR { return nil }
        throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno))
    }
    var bytes = [UInt8](repeating: 0, count: length)
    let count = descriptor.map { fgetxattr($0, name, &bytes, length, 0, 0) } ?? getxattr(path, name, &bytes, length, 0, XATTR_NOFOLLOW)
    guard count >= 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    return Data(bytes.prefix(count))
}

func readRawTags(_ path: String, descriptor: Int32? = nil) throws -> [String] {
    guard let data = try readAttribute(tagAttribute, path: path, descriptor: descriptor) else { return [] }
    let plist = try PropertyListSerialization.propertyList(from: data, options: [], format: nil)
    guard let tags = plist as? [String] else {
        throw TagStoreError.message("The existing Finder tags are unreadable. They were left unchanged.")
    }
    return tags
}

func writeMetadata(_ tags: [String], path: String, descriptor: Int32) throws {
    let originalTags = try readAttribute(tagAttribute, path: path, descriptor: descriptor)
    let originalInfo = try readAttribute(finderInfoAttribute, path: path, descriptor: descriptor)
    var info = originalInfo ?? Data(repeating: 0, count: 32)
    guard info.count == 32 else { throw TagStoreError.message("Finder information is unreadable. This file was left unchanged.") }
    // Finder's legacy label occupies bits 1–3 of the low Finder-flags byte.
    let color = tags.map(decodeTag).first(where: { $0.color > 0 })?.color ?? 0
    info[9] = (info[9] & ~0x0e) | UInt8(color << 1)
    try writeRawTags(tags, to: path, descriptor: descriptor)
    guard info != (originalInfo ?? Data(repeating: 0, count: 32)) else { return }
    let result = info.withUnsafeBytes { fsetxattr(descriptor, finderInfoAttribute, $0.baseAddress, $0.count, 0, 0) }
    if result != 0 {
        let cause = NSError(domain: NSPOSIXErrorDomain, code: Int(errno))
        let rollback: Int32
        if let originalTags {
            rollback = originalTags.withUnsafeBytes { fsetxattr(descriptor, tagAttribute, $0.baseAddress, $0.count, 0, 0) }
        } else {
            rollback = fremovexattr(descriptor, tagAttribute, 0)
        }
        guard rollback == 0 else { throw TagStoreError.message("The label update and rollback failed. Check this file's tags before retrying. \(cause.localizedDescription)") }
        throw cause
    }
}

func writeRawTags(_ tags: [String], to path: String, descriptor: Int32? = nil) throws {
    let data = try PropertyListSerialization.data(fromPropertyList: tags, format: .binary, options: 0)
    let result = data.withUnsafeBytes {
        if let descriptor { return fsetxattr(descriptor, tagAttribute, $0.baseAddress, $0.count, 0, 0) }
        return setxattr(path, tagAttribute, $0.baseAddress, $0.count, 0, XATTR_NOFOLLOW)
    }
    guard result == 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
}

func mergedRawTags(_ existing: [String], operation: TagOperation, palette: [FinderTag]) throws -> [String] {
    func rawTag(_ name: String) -> String {
        let match = palette.first { tagKey($0.name) == tagKey(name) }
        return "\(match?.name ?? name)\n\(match?.color ?? 0)"
    }
    func adding(_ names: [String], to raw: [String]) throws -> [String] {
        try validateTagNames(names)
        var result = raw
        for name in names where !result.contains(where: { tagKey(decodeTag($0).name) == tagKey(name) }) {
            result.append(rawTag(name))
        }
        return result
    }
    switch operation {
    case .read: return existing
    case .add(let names): return try adding(names, to: existing)
    case .remove(let names):
        try validateTagNames(names)
        let keys = Set(names.map(tagKey))
        return existing.filter { !keys.contains(tagKey(decodeTag($0).name)) }
    case .set(let names):
        try validateTagNames(names)
        let keys = Set(names.map(tagKey))
        return try adding(names, to: existing.filter { keys.contains(tagKey(decodeTag($0).name)) })
    case .rename(let old, let new):
        try validateTagNames([old, new])
        guard let original = existing.map(decodeTag).first(where: { tagKey($0.name) == tagKey(old) }) else { return existing }
        let remaining = existing.filter { tagKey(decodeTag($0).name) != tagKey(old) }
        if remaining.contains(where: { tagKey(decodeTag($0).name) == tagKey(new) }) { return remaining }
        let destination = palette.first { tagKey($0.name) == tagKey(new) && tagKey($0.name) != tagKey(old) }
        return remaining + ["\(destination?.name ?? new)\n\(destination?.color ?? original.color)"]
    }
}

func processFiles(_ paths: [String], operation: TagOperation, palette: [FinderTag]? = nil) -> FileBatch {
    let colors = palette ?? finderCatalog().tags
    var batch = FileBatch()
    for path in NSOrderedSet(array: paths).array.compactMap({ $0 as? String }) {
        do {
            guard path.hasPrefix("/"), !path.contains("\0") else { throw TagStoreError.message("Use an absolute file path.") }
            let url = URL(fileURLWithPath: path)
            let values = try url.resourceValues(forKeys: [
                .nameKey, .fileSizeKey, .contentModificationDateKey, .localizedTypeDescriptionKey,
                .isSymbolicLinkKey, .volumeIsLocalKey, .contentTypeKey, .isRegularFileKey, .isDirectoryKey,
            ])
            guard values.isSymbolicLink != true else { throw TagStoreError.message("Symbolic links are skipped. Select the original file.") }
            guard values.isRegularFile == true || values.isDirectory == true else { throw TagStoreError.message("Only regular files and folders can be tagged.") }
            let descriptor = open(path, O_RDONLY | O_NOFOLLOW | O_NONBLOCK)
            guard descriptor >= 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
            defer { close(descriptor) }
            guard flock(descriptor, LOCK_EX) == 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
            defer { flock(descriptor, LOCK_UN) }
            var existing = try readRawTags(path, descriptor: descriptor)
            // A legacy Finder label can exist even when the tags attribute is empty or absent.
            if existing.isEmpty {
                let legacy = try URL(fileURLWithPath: path).resourceValues(forKeys: [.tagNamesKey, .labelNumberKey])
                existing = (legacy.tagNames ?? []).map { "\($0)\n\(legacy.labelNumber ?? 0)" }
            }
            let next = try mergedRawTags(existing, operation: operation, palette: colors)
            let changed = existing != next
            if changed {
                guard values.volumeIsLocal == true else { throw TagStoreError.message("Network volumes are skipped because Finder tags may not persist.") }
                var stats = statfs()
                guard statfs(path, &stats) == 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
                let filesystem = withUnsafeBytes(of: &stats.f_fstypename) { buffer in
                    String(decoding: buffer.prefix(while: { $0 != 0 }), as: UTF8.self)
                }
                guard filesystem != "msdos", filesystem != "exfat" else { throw TagStoreError.message("FAT and exFAT volumes are skipped because Finder tags may not persist.") }
                try writeMetadata(next, path: path, descriptor: descriptor)
            }
            batch.files.append(TaggedFile(
                path: path, name: values.name ?? url.lastPathComponent, tags: next.map(decodeTag),
                kind: values.localizedTypeDescription ?? "File", contentTypes: typeIdentifiers(values.contentType), size: values.fileSize ?? 0,
                modifiedAt: values.contentModificationDate.map { ISO8601DateFormatter().string(from: $0) }, changed: changed
            ))
        } catch {
            batch.failures.append(FileFailure(path: path, message: error.localizedDescription))
        }
    }
    return batch
}

func encodeJSON<T: Encodable>(_ value: T) throws -> String {
    String(decoding: try JSONEncoder().encode(value), as: UTF8.self)
}

func typeIdentifiers(_ type: UTType?) -> [String] {
    guard let type else { return [] }
    var identifiers: Set<String> = [type.identifier]
    for parent in type.supertypes { identifiers.formUnion(typeIdentifiers(parent)) }
    return identifiers.sorted()
}

func volumeMountPath(_ path: String) throws -> String {
    var stats = statfs()
    guard statfs(path, &stats) == 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    return withUnsafeBytes(of: &stats.f_mntonname) { buffer in
        String(decoding: buffer.prefix(while: { $0 != 0 }), as: UTF8.self)
    }
}
