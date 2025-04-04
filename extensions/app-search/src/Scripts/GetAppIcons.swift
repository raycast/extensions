import Cocoa

let arguments: [String] = CommandLine.arguments
guard arguments.count > 2 else {
    print("Error: No app path or destination path provided")
    exit(1)
}

let arg1: String = arguments[1]
if arg1 == "-l" {
    let appPaths: [String] = Array(arguments[3..<arguments.count])
    let destinationPath: String = arguments[2]
    getAppIcons(appPaths: appPaths, saveLocation: destinationPath)
}
else {
    let appPath: String = arguments[1]
    let destinationPath: String = arguments[2]
    getAppIcon(appPath: appPath, saveLocation: destinationPath)
}

func getAppIcon(appPath: String, saveLocation: String) {
    let icon: Optional<NSImage> = NSWorkspace.shared.icon(forFile: appPath)
    if let icon: NSImage = icon {
        let imageData: Data? = icon.tiffRepresentation
        let bitmap: NSBitmapImageRep? = NSBitmapImageRep(data: imageData!)
        guard let pngData: Data = bitmap?.representation(using: .png, properties: [:]), !pngData.isEmpty else {
            print("Error: Invalid PNG data")
            exit(1)
        }
        do {
            try pngData.write(to: URL(fileURLWithPath: saveLocation))
        } catch {
            print("Error: could not save to \(saveLocation)")
            exit(1)
        }
    }
    else {
        print("Error: Could not extract icon")
        exit(1)
    }
}

func getAppIcons(appPaths: [String], saveLocation: String) {
    for appPath: String in appPaths {
        let saveLocation: String = saveLocation + "/" + appPath.split(separator: "/").last!.replacingOccurrences(of: ".app", with: "") + ".png"
        getAppIcon(appPath: appPath, saveLocation: saveLocation)
    }
}