import AppKit

private func makeWallpaperConfiguration(for fileURL: URL) throws -> Data {
    let configuration: [String: Any] = [
        "type": "imageFile",
        "url": ["relative": fileURL.absoluteString],
    ]
    return try PropertyListSerialization.data(fromPropertyList: configuration, format: .binary, options: 0)
}

private func patchDesktopChoices(in dict: inout [String: Any], with choice: [String: Any], timestamp: Date) {
    guard var desktop = dict["Desktop"] as? [String: Any],
          var content = desktop["Content"] as? [String: Any] else { return }
    content["Choices"] = [choice]
    desktop["Content"] = content
    desktop["LastSet"] = timestamp
    desktop["LastUse"] = timestamp
    dict["Desktop"] = desktop
}

func applyWallpaperAcrossAllSpaces(_ imagePath: String) throws {
    let imageURL = URL(fileURLWithPath: imagePath)
    guard FileManager.default.fileExists(atPath: imagePath) else {
        throw AppearanceManagerError.wallpaperFileNotFound(imagePath)
    }

    guard let appSupportURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
        throw AppearanceManagerError.applicationSupportUnavailable
    }
    let storeURL = appSupportURL.appendingPathComponent(WallpaperStore.relativePath)

    guard FileManager.default.fileExists(atPath: storeURL.path) else {
        for screen in NSScreen.screens {
            try NSWorkspace.shared.setDesktopImageURL(imageURL, for: screen, options: [
                .imageScaling: NSImageScaling.scaleProportionallyUpOrDown.rawValue,
                .allowClipping: true,
            ])
        }
        return
    }

    let configBlob = try makeWallpaperConfiguration(for: imageURL)
    let wallpaperChoice: [String: Any] = [
        "Configuration": configBlob,
        "Files": [] as [Any],
        "Provider": WallpaperStore.imageProvider,
    ]
    let timestamp = Date()

    sendSignal("-STOP", to: "WallpaperAgent")

    var plist = try {
        let data = try Data(contentsOf: storeURL)
        guard let parsed = try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else {
            throw AppearanceManagerError.wallpaperStoreParseFailed
        }
        return parsed
    }()

    if var systemDefault = plist["SystemDefault"] as? [String: Any] {
        patchDesktopChoices(in: &systemDefault, with: wallpaperChoice, timestamp: timestamp)
        plist["SystemDefault"] = systemDefault
    }

    if var displays = plist["Displays"] as? [String: Any] {
        for (displayID, displayVal) in displays {
            guard var display = displayVal as? [String: Any] else { continue }
            patchDesktopChoices(in: &display, with: wallpaperChoice, timestamp: timestamp)
            displays[displayID] = display
        }
        plist["Displays"] = displays
    }

    if var spaces = plist["Spaces"] as? [String: Any] {
        for (spaceID, spaceVal) in spaces {
            guard var space = spaceVal as? [String: Any] else { continue }

            if var defaultEntry = space["Default"] as? [String: Any] {
                patchDesktopChoices(in: &defaultEntry, with: wallpaperChoice, timestamp: timestamp)
                space["Default"] = defaultEntry
            }

            if var spaceDisplays = space["Displays"] as? [String: Any] {
                for (displayID, displayVal) in spaceDisplays {
                    guard var display = displayVal as? [String: Any] else { continue }
                    patchDesktopChoices(in: &display, with: wallpaperChoice, timestamp: timestamp)
                    spaceDisplays[displayID] = display
                }
                space["Displays"] = spaceDisplays
            }

            spaces[spaceID] = space
        }
        plist["Spaces"] = spaces
    }

    let patchedData = try PropertyListSerialization.data(fromPropertyList: plist, format: .binary, options: 0)
    try patchedData.write(to: storeURL)

    sendSignal("-9", to: "WallpaperAgent")

    for screen in NSScreen.screens {
        try NSWorkspace.shared.setDesktopImageURL(imageURL, for: screen, options: [
            .imageScaling: NSImageScaling.scaleProportionallyUpOrDown.rawValue,
            .allowClipping: true,
        ])
    }
}
