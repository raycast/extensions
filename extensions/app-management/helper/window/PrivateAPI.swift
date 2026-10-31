// PrivateAPI.swift — every undocumented macOS symbol this helper uses, in one place.
//
// None of these are documented by Apple. They were identified from public write-ups in
// AltTab (lwouis/alt-tab-macos) and Window Switcher (devadathanmb/raycast-window-switcher),
// read as documentation only; no code from those GPL projects is copied here.
//
// Each symbol is resolved at runtime with dlsym, so a symbol removed by a future macOS
// shows up as `false` in `window-helper check` instead of stopping the helper from launching.
// SkyLight names (SLS*) are tried first; CoreGraphics re-exports them as CGS* aliases.
//
// | Symbol                              | Used for                                   | If missing                          |
// | ----------------------------------- | ------------------------------------------ | ----------------------------------- |
// | _AXUIElementGetWindow               | AX window element -> CGWindowID            | cannot identify windows (fatal)     |
// | _AXUIElementCreateWithRemoteToken   | reach windows the app hides from kAXWindows| other-Desktop windows unresolved    |
// | SLSMainConnectionID                 | WindowServer connection for calls below    | no Space data                       |
// | SLSCopySpacesForWindows             | which Space(s) a window is on              | no Space data, reduced tab filtering|
// | SLSCopyManagedDisplaySpaces         | displays, their Spaces, current Space      | no Desktop labels                   |
// | SLSManagedDisplayGetCurrentSpace    | current Space per display                  | falls back to the topology read     |
// | _SLPSSetFrontProcessWithOptions     | private activation fallback (Tier B)       | public activation only              |
// | GetProcessForPID                    | pid -> ProcessSerialNumber for the above   | public activation only              |

import ApplicationServices
import CoreGraphics
import Darwin
import Foundation

typealias CGSConnection = Int32
typealias SpaceID = UInt64

typealias AXGetWindowFn = @convention(c) (AXUIElement, UnsafeMutablePointer<CGWindowID>) -> AXError
typealias AXRemoteTokenFn = @convention(c) (CFData) -> Unmanaged<AXUIElement>?
typealias MainConnectionFn = @convention(c) () -> CGSConnection
typealias CopySpacesForWindowsFn = @convention(c) (CGSConnection, Int32, CFArray) -> Unmanaged<CFArray>?
typealias CopyManagedDisplaySpacesFn = @convention(c) (CGSConnection) -> Unmanaged<CFArray>?
typealias DisplayCurrentSpaceFn = @convention(c) (CGSConnection, CFString) -> SpaceID
typealias SetFrontProcessFn = @convention(c) (UnsafeMutablePointer<ProcessSerialNumber>, CGWindowID, UInt32) -> Int32
typealias GetProcessForPIDFn = @convention(c) (pid_t, UnsafeMutablePointer<ProcessSerialNumber>) -> OSStatus

private let rtldDefault = UnsafeMutableRawPointer(bitPattern: -2)
private let skyLight = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight", RTLD_LAZY)

private func resolve(_ names: [String]) -> (name: String, pointer: UnsafeMutableRawPointer)? {
    for name in names {
        if let handle = skyLight, let p = dlsym(handle, name) { return (name, p) }
        if let p = dlsym(rtldDefault, name) { return (name, p) }
    }
    return nil
}

struct PrivateAPI {
    let axGetWindow: AXGetWindowFn?
    let axRemoteToken: AXRemoteTokenFn?
    let mainConnection: MainConnectionFn?
    let copySpacesForWindows: CopySpacesForWindowsFn?
    let copyManagedDisplaySpaces: CopyManagedDisplaySpacesFn?
    let displayCurrentSpace: DisplayCurrentSpaceFn?
    let setFrontProcess: SetFrontProcessFn?
    let getProcessForPID: GetProcessForPIDFn?
    let resolvedNames: [String: String?]

    static let shared = PrivateAPI()

    private init() {
        var names: [String: String?] = [:]
        func load<T>(_ key: String, _ candidates: [String], as: T.Type) -> T? {
            guard let found = resolve(candidates) else {
                names[key] = .some(nil)
                return nil
            }
            names[key] = found.name
            return unsafeBitCast(found.pointer, to: T.self)
        }
        axGetWindow = load("axGetWindow", ["_AXUIElementGetWindow"], as: AXGetWindowFn.self)
        axRemoteToken = load("axRemoteToken", ["_AXUIElementCreateWithRemoteToken"], as: AXRemoteTokenFn.self)
        mainConnection = load("mainConnection", ["SLSMainConnectionID", "CGSMainConnectionID"], as: MainConnectionFn.self)
        copySpacesForWindows = load(
            "copySpacesForWindows", ["SLSCopySpacesForWindows", "CGSCopySpacesForWindows"], as: CopySpacesForWindowsFn.self)
        copyManagedDisplaySpaces = load(
            "copyManagedDisplaySpaces", ["SLSCopyManagedDisplaySpaces", "CGSCopyManagedDisplaySpaces"],
            as: CopyManagedDisplaySpacesFn.self)
        displayCurrentSpace = load(
            "displayCurrentSpace", ["SLSManagedDisplayGetCurrentSpace", "CGSManagedDisplayGetCurrentSpace"],
            as: DisplayCurrentSpaceFn.self)
        setFrontProcess = load("setFrontProcess", ["_SLPSSetFrontProcessWithOptions"], as: SetFrontProcessFn.self)
        getProcessForPID = load("getProcessForPID", ["GetProcessForPID"], as: GetProcessForPIDFn.self)
        resolvedNames = names
    }

    var connection: CGSConnection? { mainConnection?() }

    func windowID(of element: AXUIElement) -> CGWindowID? {
        guard let fn = axGetWindow else { return nil }
        var wid: CGWindowID = 0
        return fn(element, &wid) == .success && wid != 0 ? wid : nil
    }

    /// Space IDs that contain `wid`. Mask 7 = current and other Spaces.
    /// Returns nil when the private call is unavailable, [] when the window has no Space.
    func spaces(of wid: CGWindowID, connection cid: CGSConnection) -> [SpaceID]? {
        guard let fn = copySpacesForWindows else { return nil }
        let widArray = [NSNumber(value: wid)] as CFArray
        guard let result = fn(cid, 7, widArray)?.takeRetainedValue() as? [NSNumber] else { return [] }
        return result.map { $0.uint64Value }
    }

    /// Builds an AX element from the 20-byte remote token: pid (4), zero (4), 0x636f636f (4), element id (8).
    /// Scans element ids from 0 until `budget` seconds elapse or `inspect` returns true.
    func scanRemoteElements(pid: pid_t, budget: TimeInterval, inspect: (AXUIElement) -> Bool) -> (scanned: UInt64, timedOut: Bool) {
        guard let fn = axRemoteToken, let token = CFDataCreateMutable(kCFAllocatorDefault, 20) else { return (0, false) }
        CFDataSetLength(token, 20)
        guard let bytes = CFDataGetMutableBytePtr(token) else { return (0, false) }
        memset(bytes, 0, 20)
        var pidField = pid
        memcpy(bytes, &pidField, 4)
        var magic = Int32(0x636f_636f)
        memcpy(bytes + 8, &magic, 4)
        let start = Date()
        var id: UInt64 = 0
        while Date().timeIntervalSince(start) < budget {
            var idField = id
            memcpy(bytes + 12, &idField, 8)
            if let element = fn(token)?.takeRetainedValue(), inspect(element) {
                return (id + 1, false)
            }
            id += 1
        }
        return (id, true)
    }
}
