import Cocoa
import Foundation
import SwiftProtobuf

let args = RunTimeArgs()
args.parse()

// Application
var app = NSWorkspace.shared.menuBarOwningApplication!

let appPath = app.bundleURL?.path ?? app.executableURL?.path ?? "icon.png"
let appLocalizedName = app.localizedName ?? "no-name"
let appBundleId = app.bundleIdentifier ?? "no-id"
let appDisplayName = "\(appLocalizedName)"
let axApp = AXUIElementCreateApplication(app.processIdentifier)

// if were not able to get the application, throw an error
guard let app = NSWorkspace.shared.menuBarOwningApplication else {
    print(createJSONMessage(messageData: MessageData(message: "Unable to get application", success: false)))
    exit(1)
}

// Get Reference to the main menu
let menuBar = MenuBar(for: app)
switch menuBar.initState {
    case .success:
        break

    case .apiDisabled:
        print(createJSONMessage(messageData: MessageData(message: "Accessibility API is disabled", success: false)))
        exit(1)

    case .noValue:
        print(createJSONMessage(messageData: MessageData(message: "Unable to get menu bar", success: false)))
        exit(1)

    default:
        print(createJSONMessage(messageData: MessageData(message: "Unknown error", success: false)))
        exit(1)            
}

// Click the menu item
if let clickIndices = args.clickIndices, clickIndices.count > 0 {
    menuBar.click(pathIndices: clickIndices)
    exit(0)
}

let menuItems: [MenuItem]

if args.loadAync {
    menuItems = menuBar.loadAsync(args.options)
} else {
    menuItems = menuBar.load(args.options)
}


let json = printMenuItemsAsJSON(menuItems)
print(json)

exit(0)