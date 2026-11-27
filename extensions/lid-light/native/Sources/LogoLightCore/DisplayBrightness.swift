import CoreGraphics
import Foundation

/// The built-in display's brightness, through the private DisplayServices framework. `nil` where
/// that framework or the built-in display isn't there (e.g. with the lid closed).
public struct DisplayBrightness {
    private typealias GetFunction = @convention(c) (UInt32, UnsafeMutablePointer<Float>) -> Int32
    private typealias SetFunction = @convention(c) (UInt32, Float) -> Int32
    private let getFunction: GetFunction
    private let setFunction: SetFunction
    private let display: CGDirectDisplayID

    public init?() {
        guard let handle = dlopen("/System/Library/PrivateFrameworks/DisplayServices.framework/DisplayServices", RTLD_LAZY),
              let get = dlsym(handle, "DisplayServicesGetBrightness"),
              let set = dlsym(handle, "DisplayServicesSetBrightness")
        else { return nil }
        getFunction = unsafeBitCast(get, to: GetFunction.self)
        setFunction = unsafeBitCast(set, to: SetFunction.self)
        var ids = [CGDirectDisplayID](repeating: 0, count: 16)
        var count: UInt32 = 0
        guard CGGetOnlineDisplayList(16, &ids, &count) == .success,
              let builtIn = ids.prefix(Int(count)).first(where: { CGDisplayIsBuiltin($0) != 0 })
        else { return nil }
        display = builtIn
    }

    /// From 0 to 1, as the brightness slider in Control Center shows it.
    public var value: Float? {
        var value: Float = 0
        return getFunction(display, &value) == 0 ? value : nil
    }

    @discardableResult
    public func set(_ value: Float) -> Bool { setFunction(display, value) == 0 }

    /// Writes the built-in display's brightness back as it is. The display doesn't change, but
    /// corebrightnessd then takes a brightness mapping written to the logo's module at once, instead of
    /// at the next change of the display's nits (docs/corebrightnessd.md, "Brightness mappings").
    @MainActor
    @discardableResult
    public static func rewrite() -> Bool {
        guard let display = DisplayBrightness(), let value = display.value else { return false }
        return display.set(value)
    }
}
