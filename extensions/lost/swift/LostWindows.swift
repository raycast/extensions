import AppKit
import ApplicationServices
import CoreGraphics
import Darwin
import Foundation

struct WindowDTO: Codable {
    let appName: String
    let bundleId: String
    let unixId: Int
    let title: String
    let index: Int
    let minimized: Bool
    let appPath: String?
    let localizedName: String?
    let width: Int
    let height: Int
    let windowId: Int
    let thumbnail: String?
}

private struct Candidate {
    let dto: WindowDTO
    let x: Int
    let y: Int
    let width: Int
    let height: Int
    let isHelper: Bool
    let boundsKey: String
}

private let skipOwners: Set<String> = [
    "Window Server",
    "Dock",
    "NotificationCenter",
    "Control Center",
    "SystemUIServer",
    "Spotlight",
    "Raycast",
    "loginwindow",
    "Screenshot",
    "Wallpaper",
    "FinderSync",
    "storeuid",
    "SiriNCService",
    "Notification Center",
    "Emoji & Symbols",
    "SetappAgent",
    "QuickLookUIService",
]

private typealias GetProcessForPIDFn = @convention(c) (pid_t, UnsafeMutablePointer<Darwin.ProcessSerialNumber>) -> Int32
private typealias SLPSSetFrontProcessWithOptionsFn = @convention(c) (
    UnsafeMutablePointer<Darwin.ProcessSerialNumber>,
    UInt32,
    UInt32
) -> Int32
private typealias SLPSPostEventRecordToFn = @convention(c) (
    UnsafeMutablePointer<Darwin.ProcessSerialNumber>,
    UnsafeRawPointer
) -> Int32
private typealias AXUIElementGetWindowFn = @convention(c) (AXUIElement, UnsafeMutablePointer<UInt32>) -> Int32
private typealias SLSMainConnectionIDFn = @convention(c) () -> Int32
private typealias SLSCopySpacesForWindowsFn = @convention(c) (Int32, Int32, CFArray) -> UnsafeRawPointer?
private typealias SLSCopyManagedDisplaySpacesFn = @convention(c) (Int32) -> UnsafeRawPointer?
private typealias SLSCopyManagedDisplayForSpaceFn = @convention(c) (Int32, UInt64) -> UnsafeRawPointer?
private typealias SLSManagedDisplayGetCurrentSpaceFn = @convention(c) (Int32, CFString) -> UInt64
private typealias SLSManagedDisplaySetCurrentSpaceFn = @convention(c) (Int32, CFString, UInt64) -> Void
private typealias SLSShowHideSpacesFn = @convention(c) (Int32, CFArray) -> Int32
private typealias SLSGetActiveSpaceFn = @convention(c) (Int32) -> UInt64
private typealias CGSHWCaptureWindowListFn = @convention(c) (
    UInt32,
    UnsafeMutablePointer<UInt32>,
    UInt32,
    UInt32
) -> Unmanaged<CFArray>?

private let skyLight = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight", RTLD_LAZY)

private func skySym<T>(_ names: String...) -> T? {
    guard let skyLight else {
        return nil
    }
    for name in names {
        if let symbol = dlsym(skyLight, name) {
            return unsafeBitCast(symbol, to: T.self)
        }
    }
    return nil
}

private func skyConnection() -> Int32? {
    let mainID: SLSMainConnectionIDFn? = skySym("SLSMainConnectionID", "CGSMainConnectionID")
    let cid = mainID?() ?? 0
    return cid == 0 ? nil : cid
}

private func parentAppPath(_ path: String) -> String {
    guard let range = path.range(of: "/Contents/Helpers/") else {
        return path
    }
    return String(path[..<range.lowerBound])
}

private func resolveApp(pid: pid_t, owner: String) -> (name: String, bundleId: String, path: String, isHelper: Bool) {
    var name = owner
    var bundleId = ""
    var path = ""

    if let app = NSRunningApplication(processIdentifier: pid) {
        name = app.localizedName ?? owner
        bundleId = app.bundleIdentifier ?? ""
        path = app.bundleURL?.path ?? ""
    }

    let helperByPath = path.contains("/Contents/Helpers/") || path.contains("/XPCServices/")
    let helperByOwner = owner.contains("WebView") || owner.contains("Helper") || owner.contains("ModuleHost")
    let helperByBundle = bundleId.range(
        of: #"\.(helper|webview|modulehost|notificationcenter|teamsswitcher)"#,
        options: [.regularExpression, .caseInsensitive]
    ) != nil

    let resolved = parentAppPath(path)
    if resolved != path, let bundle = Bundle(path: resolved) {
        bundleId = bundle.bundleIdentifier ?? bundleId
        name = (bundle.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String)
            ?? (bundle.object(forInfoDictionaryKey: "CFBundleName") as? String)
            ?? name.replacingOccurrences(of: #"\s+(WebView|Helper|ModuleHost).*$"#, with: "", options: .regularExpression)
        path = resolved
    } else if helperByBundle {
        bundleId = bundleId.replacingOccurrences(
            of: #"\.(helper|webview|modulehost|notificationcenter|teamsswitcher).*$"#,
            with: "",
            options: [.regularExpression, .caseInsensitive]
        )
    }

    return (name, bundleId, path, helperByPath || helperByOwner || helperByBundle)
}

private func isNoiseName(_ name: String) -> Bool {
    name.hasPrefix("AutoFill (") || name.hasPrefix("Open and Save Panel") || name.contains("UIViewService")
}

private func isPlaceholder(x: Int, y: Int, width: Int, height: Int) -> Bool {
    if width < 200 || height < 120 {
        return true
    }
    if width == 500 && height == 500 && x == 0 && y == 617 {
        return true
    }
    if width == 800 && height == 600 && x == 0 && y == 0 {
        return true
    }
    return false
}

private func walkSpaces(_ value: Any, titles: inout [Int: String]) {
    if let dict = value as? [String: Any] {
        let name = dict["name"] as? String
        let windowId = (dict["TileWindowID"] as? NSNumber)?.intValue
            ?? (dict["fs_wid"] as? NSNumber)?.intValue
            ?? (dict["TileWindowID"] as? Int)
            ?? (dict["fs_wid"] as? Int)
        if let name, let windowId, !name.isEmpty, windowId > 0 {
            titles[windowId] = name
        }
        for nested in dict.values {
            walkSpaces(nested, titles: &titles)
        }
    } else if let array = value as? [Any] {
        for nested in array {
            walkSpaces(nested, titles: &titles)
        }
    }
}

private func windowTitlesFromSpaces() -> [Int: String] {
    let url = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Preferences/com.apple.spaces.plist")
    guard let data = try? Data(contentsOf: url),
          let plist = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil)
    else {
        return [:]
    }
    var titles: [Int: String] = [:]
    walkSpaces(plist, titles: &titles)
    return titles
}

private func cleanedTitle(_ raw: String, appName: String) -> String {
    let suffix = " | \(appName)"
    if raw.hasSuffix(suffix) {
        return String(raw.dropLast(suffix.count))
    }
    return raw
}

private func listWindows() -> [WindowDTO] {
    guard let info = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] else {
        return listRunningApps()
    }

    let spaceTitles = windowTitlesFromSpaces()
    var collected: [Candidate] = []

    for win in info {
        let layer = (win[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0
        if layer != 0 {
            continue
        }

        let owner = win[kCGWindowOwnerName as String] as? String ?? ""
        if owner.isEmpty || skipOwners.contains(owner) || isNoiseName(owner) || owner.contains("UIService") {
            continue
        }

        let bounds = win[kCGWindowBounds as String] as? [String: Any]
        let width = Int((bounds?["Width"] as? NSNumber)?.doubleValue ?? 0)
        let height = Int((bounds?["Height"] as? NSNumber)?.doubleValue ?? 0)
        let x = Int((bounds?["X"] as? NSNumber)?.doubleValue ?? 0)
        let y = Int((bounds?["Y"] as? NSNumber)?.doubleValue ?? 0)
        if isPlaceholder(x: x, y: y, width: width, height: height) {
            continue
        }

        let pid = (win[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value ?? 0
        let app = resolveApp(pid: pid, owner: owner)
        if app.bundleId == "com.raycast.macos" || isNoiseName(app.name) {
            continue
        }

        let windowId = (win[kCGWindowNumber as String] as? NSNumber)?.intValue ?? 0
        let cgTitle = win[kCGWindowName as String] as? String ?? ""
        let spaceTitle = spaceTitles[windowId] ?? ""
        let title = cleanedTitle(cgTitle.isEmpty ? spaceTitle : cgTitle, appName: app.name)
        let family = app.bundleId.isEmpty ? app.name : app.bundleId
        collected.append(
            Candidate(
                dto: WindowDTO(
                    appName: app.name,
                    bundleId: app.bundleId,
                    unixId: Int(pid),
                    title: title,
                    index: 0,
                    minimized: false,
                    appPath: app.path.isEmpty ? nil : app.path,
                    localizedName: app.name,
                    width: width,
                    height: height,
                    windowId: windowId,
                    thumbnail: nil
                ),
                x: x,
                y: y,
                width: width,
                height: height,
                isHelper: app.isHelper,
                boundsKey: "\(family):\(x):\(y):\(width):\(height)"
            )
        )
    }

    let parentBounds = Set(collected.filter { !$0.isHelper }.map(\.boundsKey))
    let kept = collected.filter { candidate in
        !candidate.isHelper || !parentBounds.contains(candidate.boundsKey)
    }

    var indexes: [String: Int] = [:]
    var results: [WindowDTO] = []
    for item in kept {
        let family = item.dto.bundleId.isEmpty ? item.dto.appName : item.dto.bundleId
        let nextIndex = (indexes[family] ?? 0) + 1
        indexes[family] = nextIndex
        results.append(
            WindowDTO(
                appName: item.dto.appName,
                bundleId: item.dto.bundleId,
                unixId: item.dto.unixId,
                title: item.dto.title,
                index: nextIndex,
                minimized: item.dto.minimized,
                appPath: item.dto.appPath,
                localizedName: item.dto.localizedName,
                width: item.dto.width,
                height: item.dto.height,
                windowId: item.dto.windowId,
                thumbnail: nil
            )
        )
    }

    return results.isEmpty ? listRunningApps() : results
}

private func listRunningApps() -> [WindowDTO] {
    NSWorkspace.shared.runningApplications
        .filter { app in
            app.activationPolicy == .regular &&
                app.bundleIdentifier != "com.raycast.macos" &&
                !(app.localizedName ?? "").isEmpty
        }
        .map { app in
            WindowDTO(
                appName: app.localizedName ?? "App",
                bundleId: app.bundleIdentifier ?? "",
                unixId: Int(app.processIdentifier),
                title: app.localizedName ?? "App",
                index: 1,
                minimized: false,
                appPath: app.bundleURL?.path,
                localizedName: app.localizedName,
                width: 0,
                height: 0,
                windowId: 0,
                thumbnail: nil
            )
        }
}

private func thumbnailDirectory() -> URL {
    FileManager.default.temporaryDirectory.appendingPathComponent("lost-window-thumbs", isDirectory: true)
}

private func ensureThumbnailDirectory() {
    try? FileManager.default.createDirectory(at: thumbnailDirectory(), withIntermediateDirectories: true)
}

private func cgsConnectionID() -> UInt32? {
    let mainID: (@convention(c) () -> UInt32)? = skySym("CGSMainConnectionID", "SLSMainConnectionID")
    let cid = mainID?() ?? 0
    return cid == 0 ? nil : cid
}

private final class CaptureBox: @unchecked Sendable {
    var image: CGImage?
}

private func captureWindowImageBlocking(_ windowId: UInt32) -> CGImage? {
    guard let cid = cgsConnectionID(),
          let capture: CGSHWCaptureWindowListFn = skySym("CGSHWCaptureWindowList")
    else {
        return nil
    }

    var wid = windowId
    let options: UInt32 = (1 << 8) | (1 << 11)
    guard let array = capture(cid, &wid, 1, options)?.takeRetainedValue(),
          CFArrayGetCount(array) > 0,
          let value = CFArrayGetValueAtIndex(array, 0)
    else {
        return nil
    }
    let candidate = unsafeBitCast(value, to: CFTypeRef.self)
    guard CFGetTypeID(candidate) == CGImage.typeID else {
        return nil
    }
    let image = unsafeBitCast(candidate, to: CGImage.self)
    return image.width > 16 && image.height > 16 ? image : nil
}

private func captureWindowImage(_ windowId: UInt32) -> CGImage? {
    let box = CaptureBox()
    let lock = DispatchSemaphore(value: 0)
    DispatchQueue.global(qos: .userInitiated).async {
        box.image = captureWindowImageBlocking(windowId)
        lock.signal()
    }
    if lock.wait(timeout: .now() + 0.4) == .timedOut {
        return nil
    }
    return box.image
}

private func jpegThumbnail(from image: CGImage) -> Data? {
    let width = CGFloat(image.width)
    let height = CGFloat(image.height)
    let scale = min(1, 720 / max(width, height, 1))
    let outW = max(1, Int((width * scale).rounded()))
    let outH = max(1, Int((height * scale).rounded()))
    guard let ctx = CGContext(
        data: nil,
        width: outW,
        height: outH,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        return nil
    }
    ctx.interpolationQuality = .medium
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: outW, height: outH))
    guard let scaled = ctx.makeImage() else {
        return nil
    }
    return NSBitmapImageRep(cgImage: scaled).representation(using: .jpeg, properties: [.compressionFactor: 0.72])
}

private func writeThumbnail(_ image: CGImage, windowId: Int) -> String? {
    ensureThumbnailDirectory()
    guard let data = jpegThumbnail(from: image) else {
        return nil
    }
    let url = thumbnailDirectory().appendingPathComponent("\(windowId).jpg")
    do {
        try data.write(to: url, options: .atomic)
        return url.path
    } catch {
        return nil
    }
}

private func captureThumbnail(windowId: Int) -> String? {
    guard windowId > 0, let image = captureWindowImage(UInt32(windowId)) else {
        return nil
    }
    return writeThumbnail(image, windowId: windowId)
}

private func axValue(_ element: AXUIElement, _ attribute: String) -> AnyObject? {
    var value: AnyObject?
    let error = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
    return error == .success ? value : nil
}

private func raiseAXWindow(pid: pid_t, title: String, windowId: Int) {
    let app = AXUIElementCreateApplication(pid)
    guard let windows = axValue(app, kAXWindowsAttribute as String) as? [AXUIElement] else {
        return
    }

    let getWindow: AXUIElementGetWindowFn? = {
        guard let handle = dlopen("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices", RTLD_LAZY),
              let symbol = dlsym(handle, "_AXUIElementGetWindow")
        else {
            return nil
        }
        return unsafeBitCast(symbol, to: AXUIElementGetWindowFn.self)
    }()

    let match = windows.first { window in
        if windowId != 0, let getWindow {
            var cgID: UInt32 = 0
            if getWindow(window, &cgID) == 0, cgID == UInt32(windowId) {
                return true
            }
        }
        let windowTitle = axValue(window, kAXTitleAttribute as String) as? String ?? ""
        return !title.isEmpty && !windowTitle.isEmpty && (windowTitle == title || windowTitle.contains(title) || title.contains(windowTitle))
    }

    if let match {
        AXUIElementPerformAction(match, kAXRaiseAction as CFString)
    }
}

private func cfArray(_ ptr: UnsafeRawPointer?) -> CFArray? {
    guard let ptr else {
        return nil
    }
    return Unmanaged<CFArray>.fromOpaque(ptr).takeRetainedValue()
}

private func cfString(_ ptr: UnsafeRawPointer?) -> CFString? {
    guard let ptr else {
        return nil
    }
    return Unmanaged<CFString>.fromOpaque(ptr).takeRetainedValue()
}

private func managedSpaceID(from dict: [String: Any]) -> UInt64? {
    if let number = dict["ManagedSpaceID"] as? NSNumber {
        return number.uint64Value
    }
    if let number = dict["id64"] as? NSNumber {
        return number.uint64Value
    }
    return nil
}

private func managedDisplays(cid: Int32) -> [[String: Any]] {
    guard let copy: SLSCopyManagedDisplaySpacesFn = skySym("SLSCopyManagedDisplaySpaces", "CGSCopyManagedDisplaySpaces"),
          let displays = cfArray(copy(cid)) as? [[String: Any]]
    else {
        return []
    }
    return displays
}

private func spacesForWindow(_ windowId: UInt32, cid: Int32) -> [UInt64] {
    guard let copy: SLSCopySpacesForWindowsFn = skySym("SLSCopySpacesForWindows", "CGSCopySpacesForWindows") else {
        return []
    }
    let ids = [NSNumber(value: windowId)] as CFArray
    guard let spaces = cfArray(copy(cid, 0x7, ids)) as? [NSNumber] else {
        return []
    }
    return spaces.map(\.uint64Value)
}

private func displayUUID(for targetSpace: UInt64, cid: Int32, displays: [[String: Any]]) -> String? {
    for display in displays {
        let spaces = display["Spaces"] as? [[String: Any]] ?? []
        if spaces.contains(where: { managedSpaceID(from: $0) == targetSpace }) {
            return display["Display Identifier"] as? String
        }
    }
    guard let copy: SLSCopyManagedDisplayForSpaceFn = skySym("SLSCopyManagedDisplayForSpace", "CGSCopyManagedDisplayForSpace"),
          let uuid = cfString(copy(cid, targetSpace))
    else {
        return nil
    }
    return uuid as String
}

private func spaceLocation(_ targetSpace: UInt64, in displays: [[String: Any]]) -> (uuid: String, index: Int, current: UInt64)? {
    for display in displays {
        let uuid = display["Display Identifier"] as? String ?? "Main"
        let spaces = display["Spaces"] as? [[String: Any]] ?? []
        let current = (display["Current Space"] as? [String: Any]).flatMap { managedSpaceID(from: $0) } ?? 0
        if let index = spaces.firstIndex(where: { managedSpaceID(from: $0) == targetSpace }) {
            return (uuid, index, current)
        }
    }
    return nil
}

private func activeSpace(cid: Int32) -> UInt64 {
    let getActive: SLSGetActiveSpaceFn? = skySym("SLSGetActiveSpace", "CGSGetActiveSpace")
    return getActive?(cid) ?? 0
}

private func currentSpace(cid: Int32, displayUUID: String) -> UInt64 {
    if let getCurrent: SLSManagedDisplayGetCurrentSpaceFn = skySym("SLSManagedDisplayGetCurrentSpace", "CGSManagedDisplayGetCurrentSpace") {
        return getCurrent(cid, displayUUID as CFString)
    }
    return activeSpace(cid: cid)
}

private func setCurrentSpace(cid: Int32, displayUUID: String, targetSpace: UInt64) {
    if let setCurrent: SLSManagedDisplaySetCurrentSpaceFn = skySym("SLSManagedDisplaySetCurrentSpace", "CGSManagedDisplaySetCurrentSpace") {
        setCurrent(cid, displayUUID as CFString, targetSpace)
    }
}

private func postDockPair(_ dock: CGEvent) {
    guard let companion = CGEvent(source: nil) else {
        dock.post(tap: .cgSessionEventTap)
        return
    }
    companion.setIntegerValueField(CGEventField(rawValue: 55)!, value: 29)
    dock.post(tap: .cgSessionEventTap)
    companion.post(tap: .cgSessionEventTap)
}

private func postDockSwipe(towardHigherIndex: Bool) {
    let typeField = CGEventField(rawValue: 55)!
    let hidType = CGEventField(rawValue: 110)!
    let scrollY = CGEventField(rawValue: 119)!
    let motion = CGEventField(rawValue: 123)!
    let progress = CGEventField(rawValue: 124)!
    let velocityX = CGEventField(rawValue: 129)!
    let velocityY = CGEventField(rawValue: 130)!
    let phase = CGEventField(rawValue: 132)!
    let flagBits = CGEventField(rawValue: 135)!
    let zoomDeltaX = CGEventField(rawValue: 139)!
    let sign: Double = towardHigherIndex ? 1 : -1
    let flagProgress = towardHigherIndex ? Float.leastNonzeroMagnitude : -Float.leastNonzeroMagnitude
    var flagValue: Int32 = 0
    withUnsafeBytes(of: flagProgress) { raw in
        flagValue = raw.load(as: Int32.self)
    }

    func makeEvent(_ phaseValue: Int64, progressValue: Double) -> CGEvent? {
        guard let event = CGEvent(source: nil) else {
            return nil
        }
        event.setIntegerValueField(typeField, value: 30)
        event.setIntegerValueField(hidType, value: 23)
        event.setIntegerValueField(phase, value: phaseValue)
        event.setIntegerValueField(flagBits, value: Int64(flagValue))
        event.setIntegerValueField(motion, value: 1)
        event.setDoubleValueField(scrollY, value: 0)
        event.setDoubleValueField(progress, value: sign * progressValue)
        event.setDoubleValueField(zoomDeltaX, value: Double(Float.leastNonzeroMagnitude))
        return event
    }

    if let begin = makeEvent(1, progressValue: 0) {
        postDockPair(begin)
    }
    for value in [0.22, 0.45, 0.7, 0.92] {
        if let changed = makeEvent(2, progressValue: value) {
            postDockPair(changed)
        }
        Thread.sleep(forTimeInterval: 0.04)
    }
    if let end = makeEvent(4, progressValue: 1) {
        // Keep velocity low so macOS plays the normal Space slide instead of an instant cut.
        end.setDoubleValueField(velocityX, value: sign * 2.4)
        end.setDoubleValueField(velocityY, value: 0)
        postDockPair(end)
    }
}

private func switchToWindowSpace(_ windowId: UInt32) {
    guard windowId != 0, let cid = skyConnection() else {
        return
    }

    let windowSpaces = spacesForWindow(windowId, cid: cid)
    guard let target = windowSpaces.first else {
        return
    }
    if windowSpaces.count > 1 {
        return
    }

    let displays = managedDisplays(cid: cid)
    let location = spaceLocation(target, in: displays)
    let uuid = location?.uuid ?? displayUUID(for: target, cid: cid, displays: displays) ?? "Main"
    let current = location?.current ?? currentSpace(cid: cid, displayUUID: uuid)
    if current == target {
        return
    }

    let focused = activeSpace(cid: cid)
    let focusedOnThisDisplay = focused == 0 || focused == current || focused == target
        || spaceLocation(focused, in: displays)?.uuid == uuid

    if focusedOnThisDisplay, let location, location.current != 0 {
        let currentIndex = spaceLocation(location.current, in: displays)?.index ?? location.index
        let steps = location.index - currentIndex
        if steps != 0 {
            let towardHigher = steps > 0
            for _ in 0 ..< abs(steps) {
                postDockSwipe(towardHigherIndex: towardHigher)
                Thread.sleep(forTimeInterval: 0.32)
            }
        }
    }

    Thread.sleep(forTimeInterval: 0.08)
    if currentSpace(cid: cid, displayUUID: uuid) != target {
        setCurrentSpace(cid: cid, displayUUID: uuid, targetSpace: target)
        Thread.sleep(forTimeInterval: 0.28)
    }
}

private func postMakeKeyEvents(psn: inout Darwin.ProcessSerialNumber, windowId: UInt32, post: SLPSPostEventRecordToFn) {
    var bytes = [UInt8](repeating: 0, count: 0x100)
    bytes[0x04] = 0xF8
    bytes[0x3A] = 0x10
    withUnsafeBytes(of: windowId) { raw in
        for index in 0 ..< 4 {
            bytes[0x3C + index] = raw[index]
        }
    }
    for index in 0x20 ..< 0x30 {
        bytes[index] = 0xFF
    }

    bytes[0x08] = 0x01
    bytes.withUnsafeBytes { buffer in
        _ = post(&psn, buffer.baseAddress!)
    }
    bytes[0x08] = 0x02
    bytes.withUnsafeBytes { buffer in
        _ = post(&psn, buffer.baseAddress!)
    }
}

private func focus(unixId: Int32, windowId: UInt32, title: String) {
    // Let Raycast finish dismissing so it does not steal the space/window back.
    Thread.sleep(forTimeInterval: 0.12)
    switchToWindowSpace(windowId)
    Thread.sleep(forTimeInterval: 0.12)

    var psn = Darwin.ProcessSerialNumber()
    if windowId != 0,
       let hiServices = dlopen("/System/Library/Frameworks/ApplicationServices.framework/Frameworks/HIServices.framework/HIServices", RTLD_LAZY)
        ?? dlopen("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices", RTLD_LAZY),
       let getProcess = dlsym(hiServices, "GetProcessForPID")
    {
        let getPSN = unsafeBitCast(getProcess, to: GetProcessForPIDFn.self)
        if getPSN(unixId, &psn) == 0 {
            if let setFront: SLPSSetFrontProcessWithOptionsFn = skySym("_SLPSSetFrontProcessWithOptions") {
                _ = setFront(&psn, windowId, 0x200)
            }
            if let post: SLPSPostEventRecordToFn = skySym("SLPSPostEventRecordTo") {
                postMakeKeyEvents(psn: &psn, windowId: windowId, post: post)
            }
        }
    }

    raiseAXWindow(pid: unixId, title: title, windowId: Int(windowId))
}

private struct FrontDTO: Codable {
    let appName: String
    let bundleId: String
    let unixId: Int
    let windowId: Int
}

private func frontWindow() -> FrontDTO? {
    guard let info = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else {
        return nil
    }

    for win in info {
        let layer = (win[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0
        if layer != 0 {
            continue
        }

        let owner = win[kCGWindowOwnerName as String] as? String ?? ""
        if owner.isEmpty || skipOwners.contains(owner) || isNoiseName(owner) || owner.contains("UIService") {
            continue
        }

        let bounds = win[kCGWindowBounds as String] as? [String: Any]
        let width = Int((bounds?["Width"] as? NSNumber)?.doubleValue ?? 0)
        let height = Int((bounds?["Height"] as? NSNumber)?.doubleValue ?? 0)
        let x = Int((bounds?["X"] as? NSNumber)?.doubleValue ?? 0)
        let y = Int((bounds?["Y"] as? NSNumber)?.doubleValue ?? 0)
        if isPlaceholder(x: x, y: y, width: width, height: height) {
            continue
        }

        let pid = (win[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value ?? 0
        let app = resolveApp(pid: pid, owner: owner)
        if app.bundleId == "com.raycast.macos" || isNoiseName(app.name) {
            continue
        }

        let windowId = (win[kCGWindowNumber as String] as? NSNumber)?.intValue ?? 0
        if windowId == 0 {
            continue
        }

        return FrontDTO(
            appName: app.name,
            bundleId: app.bundleId,
            unixId: Int(pid),
            windowId: windowId
        )
    }

    return nil
}

private func emit(_ value: some Encodable) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try! encoder.encode(value)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}

let args = CommandLine.arguments
if args.count >= 3, args[1] == "focus" {
    let unixId = Int32(args[2]) ?? 0
    let windowId = args.count > 3 ? (UInt32(args[3]) ?? 0) : 0
    let title = args.count > 4 ? args[4...].joined(separator: " ") : ""
    focus(unixId: unixId, windowId: windowId, title: title)
} else if args.count >= 3, args[1] == "thumb" {
    struct ThumbDTO: Codable {
        let thumbnail: String?
    }
    emit(ThumbDTO(thumbnail: captureThumbnail(windowId: Int(args[2]) ?? 0)))
} else if args.count >= 2, args[1] == "front" {
    if let front = frontWindow() {
        emit(front)
    } else {
        FileHandle.standardOutput.write(Data("null\n".utf8))
    }
} else if args.count >= 2, args[1] == "spaces" {
    struct SpaceDump: Codable {
        let current: UInt64
        let spaces: [UInt64]
        let title: String
        let windowId: Int
    }
    let cid = skyConnection() ?? 0
    let current = cid == 0 ? 0 : activeSpace(cid: cid)
    emit(
        listWindows().map { window in
            SpaceDump(
                current: current,
                spaces: cid == 0 ? [] : spacesForWindow(UInt32(window.windowId), cid: cid),
                title: window.title,
                windowId: window.windowId
            )
        }
    )
} else {
    emit(listWindows())
}
