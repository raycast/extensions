import AppKit
import CoreServices
import Foundation

func catalogTag(name: String, color: Int) -> FinderTag? {
    guard (try? validateTagNames([name])) != nil else { return nil }
    return FinderTag(name: name, color: (0...7).contains(color) ? color : 0)
}

func sharedFinderTag(name: String, url: URL, color: Int) -> FinderTag? {
    guard url.scheme == "x-apple-findertag" else { return nil }
    return catalogTag(name: name, color: color)
}

// Finder keeps its local tag catalogue here, including tags hidden from the sidebar.
// The list identifier and label property are private, so keep the plist/preferences fallbacks.
func readSharedFinderTags() -> [FinderTag]? {
    guard let list = LSSharedFileListCreate(nil, "com.apple.LSSharedFileList.ProjectsItems" as CFString, nil)?.takeRetainedValue(),
          let items = LSSharedFileListCopySnapshot(list, nil)?.takeRetainedValue() as? [LSSharedFileListItem] else { return nil }
    var tags: [FinderTag] = []
    for item in items {
        let flags = LSSharedFileListResolutionFlags(kLSSharedFileListNoUserInteraction | kLSSharedFileListDoNotMountVolumes)
        guard let url = LSSharedFileListItemCopyResolvedURL(item, flags, nil)?.takeRetainedValue() as URL? else { return nil }
        let name = LSSharedFileListItemCopyDisplayName(item).takeRetainedValue() as String
        let color = LSSharedFileListItemCopyProperty(item, "kLSSharedTagFileListItemLabel" as CFString)?.takeRetainedValue() as? NSNumber
        if let tag = sharedFinderTag(name: name, url: url, color: color?.intValue ?? 0) { tags.append(tag) }
    }
    return tags
}

func finderPalette(in plist: Any) throws -> [FinderTag] {
    guard let root = plist as? [String: Any] else { throw TagStoreError.message("Unknown Finder preferences format.") }
    let values = root["values"] as? [String: Any] ?? root
    guard let dictionary = values["FinderTagDict"] as? [String: Any] else { throw TagStoreError.message("Finder's tag palette is unavailable.") }
    let value = dictionary["value"] ?? dictionary
    let entries = (value as? [String: Any])?["FinderTags"] as? [[String: Any]] ?? value as? [[String: Any]]
    guard let entries else { throw TagStoreError.message("Finder's tag palette is unavailable.") }
    return entries.compactMap { entry in
        guard let name = entry["n"] as? String else { return nil }
        return catalogTag(name: name, color: (entry["l"] as? NSNumber)?.intValue ?? 0)
    }
}

func finderCatalog(
    sharedTags: [FinderTag]? = readSharedFinderTags(),
    at path: String = NSHomeDirectory() + "/Library/SyncedPreferences/com.apple.finder.plist",
    favoriteNames: [String] = CFPreferencesCopyAppValue("FavoriteTagNames" as CFString, "com.apple.finder" as CFString) as? [String] ?? [],
    labelNames: [String] = NSWorkspace.shared.fileLabels
) -> TagCatalog {
    // An empty live catalogue is valid: do not resurrect deleted tags from stale favourites.
    if let sharedTags { return TagCatalog(tags: sharedTags, warnings: []) }
    if let data = try? Data(contentsOf: URL(fileURLWithPath: path)),
       let plist = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil),
       let tags = try? finderPalette(in: plist) { return TagCatalog(tags: tags, warnings: []) }

    var seen = Set<String>()
    let tags = favoriteNames.compactMap { name -> FinderTag? in
        let key = tagKey(name)
        guard seen.insert(key).inserted else { return nil }
        // Finder may use British "Grey" while NSWorkspace reports "Gray".
        let color = key == "grey" ? 1 : labelNames.firstIndex(where: { tagKey($0) == key }) ?? 0
        return catalogTag(name: name, color: color)
    }
    return TagCatalog(tags: tags, warnings: ["Finder's full tag catalogue is unavailable. Showing favourites and tags found on files; some tags or colours may be missing."])
}
