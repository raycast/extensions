import AppKit
import CoreGraphics
import Darwin
import Foundation
import IOKit
import IOKit.graphics

private typealias DisplayServicesGetBrightnessFn = @convention(c) (CGDirectDisplayID, UnsafeMutablePointer<Float>) -> Int32
private typealias DisplayServicesSetBrightnessFn = @convention(c) (CGDirectDisplayID, Float) -> Int32
private typealias DisplayServicesCanChangeBrightnessFn = @convention(c) (CGDirectDisplayID) -> Bool
private typealias DisplayServicesBrightnessChangedFn = @convention(c) (CGDirectDisplayID, Double) -> Void
private typealias CoreDisplayGetUserBrightnessFn = @convention(c) (CGDirectDisplayID) -> Double
private typealias CoreDisplaySetUserBrightnessFn = @convention(c) (CGDirectDisplayID, Double) -> Void
private typealias CoreDisplaySetAutoBrightnessIsEnabledFn = @convention(c) (CGDirectDisplayID, Bool) -> Void

private let tolerance: Float = 0.01
private let stepBrightness: Float = 0.0625

private struct HelperResponse: Encodable {
  let status: String
  let brightness: Int?
  let displayID: String?
  let message: String?
}

private enum HelperError: Error {
  case usage
  case invalidBrightness
  case invalidAction
  case noSupportedDisplay
  case cannotSetBrightness(CGDirectDisplayID)
  case cannotReadBrightness(CGDirectDisplayID)
  case verificationFailed(expected: Float, actual: Float)
}

enum HelperCommand {
  case set(Float)
  case step(Float)
}

private final class DynamicBrightnessSymbols {
  let displayServicesHandle = dlopen("/System/Library/PrivateFrameworks/DisplayServices.framework/DisplayServices", RTLD_NOW)
  let coreDisplayHandle = dlopen("/System/Library/Frameworks/CoreDisplay.framework/CoreDisplay", RTLD_NOW)

  deinit {
    if let handle = displayServicesHandle {
      dlclose(handle)
    }

    if let handle = coreDisplayHandle {
      dlclose(handle)
    }
  }

  lazy var displayServicesGetBrightness = load(displayServicesHandle, "DisplayServicesGetBrightness", as: DisplayServicesGetBrightnessFn.self)
  lazy var displayServicesSetBrightness = load(displayServicesHandle, "DisplayServicesSetBrightness", as: DisplayServicesSetBrightnessFn.self)
  lazy var displayServicesCanChangeBrightness = load(displayServicesHandle, "DisplayServicesCanChangeBrightness", as: DisplayServicesCanChangeBrightnessFn.self)
  lazy var displayServicesBrightnessChanged = load(displayServicesHandle, "DisplayServicesBrightnessChanged", as: DisplayServicesBrightnessChangedFn.self)
  lazy var coreDisplayGetUserBrightness = load(coreDisplayHandle, "CoreDisplay_Display_GetUserBrightness", as: CoreDisplayGetUserBrightnessFn.self)
  lazy var coreDisplaySetUserBrightness = load(coreDisplayHandle, "CoreDisplay_Display_SetUserBrightness", as: CoreDisplaySetUserBrightnessFn.self)
  lazy var coreDisplaySetAutoBrightnessIsEnabled = load(coreDisplayHandle, "CoreDisplay_Display_SetAutoBrightnessIsEnabled", as: CoreDisplaySetAutoBrightnessIsEnabledFn.self)

  private func load<T>(_ handle: UnsafeMutableRawPointer?, _ symbol: String, as type: T.Type) -> T? {
    guard let handle, let rawSymbol = dlsym(handle, symbol) else {
      return nil
    }

    return unsafeBitCast(rawSymbol, to: T.self)
  }
}

private let symbols = DynamicBrightnessSymbols()

private func emit(_ response: HelperResponse, to stream: FileHandle = .standardOutput, exitCode: Int32) -> Never {
  let encoder = JSONEncoder()
  let data = (try? encoder.encode(response)) ?? Data("{\"status\":\"error\",\"message\":\"Failed to encode helper response.\"}".utf8)
  stream.write(data)
  stream.write(Data("\n".utf8))
  Foundation.exit(exitCode)
}

private func fail(_ error: HelperError) -> Never {
  switch error {
  case .usage:
    emit(
      HelperResponse(
        status: "error",
        brightness: nil,
        displayID: nil,
        message: "Usage: brightness-helper set <0-100>"
      ),
      exitCode: 64
    )
  case .invalidBrightness:
    emit(
      HelperResponse(
        status: "error",
        brightness: nil,
        displayID: nil,
        message: "Brightness must be an integer from 0 to 100."
      ),
      exitCode: 64
    )
  case .invalidAction:
    emit(
      HelperResponse(
        status: "error",
        brightness: nil,
        displayID: nil,
        message: "Usage: brightness-helper set <0-100> | brightness-helper step <up|down>"
      ),
      exitCode: 64
    )
  case .noSupportedDisplay:
    emit(
      HelperResponse(
        status: "error",
        brightness: nil,
        displayID: nil,
        message: "No supported built-in display was found. Move the cursor onto your Mac display or open the extension on a single-display Mac."
      ),
      exitCode: 1
    )
  case .cannotSetBrightness(let displayID):
    emit(
      HelperResponse(
        status: "error",
        brightness: nil,
        displayID: hexDisplayID(displayID),
        message: "macOS refused to change brightness for display \(hexDisplayID(displayID)). Open System Settings > Displays, disable automatic adjustments if enabled, and try again."
      ),
      exitCode: 1
    )
  case .cannotReadBrightness(let displayID):
    emit(
      HelperResponse(
        status: "error",
        brightness: nil,
        displayID: hexDisplayID(displayID),
        message: "Brightness changed, but verification failed for display \(hexDisplayID(displayID)). Open System Settings > Displays and verify the built-in display supports manual brightness."
      ),
      exitCode: 1
    )
  case .verificationFailed(let expected, let actual):
    emit(
      HelperResponse(
        status: "error",
        brightness: Int((actual * 100).rounded()),
        displayID: nil,
        message: "Brightness verification failed. Expected \(Int((expected * 100).rounded()))% but read back \(Int((actual * 100).rounded()))%. Try again after opening System Settings > Displays."
      ),
      exitCode: 1
    )
  }
}

private func hexDisplayID(_ displayID: CGDirectDisplayID) -> String {
  String(format: "0x%08x", displayID)
}

private func parseCommand() -> HelperCommand {
  guard CommandLine.arguments.count == 3 else {
    fail(.usage)
  }

  switch (CommandLine.arguments[1], CommandLine.arguments[2]) {
  case ("set", let percentString):
    guard let percent = Int(percentString), (0...100).contains(percent) else {
      fail(.invalidBrightness)
    }

    return .set(Float(percent) / 100)
  case ("step", "up"):
    return .step(stepBrightness)
  case ("step", "down"):
    return .step(-stepBrightness)
  default:
    fail(.invalidAction)
  }
}

private func onlineDisplays() -> [CGDirectDisplayID] {
  var displays = [CGDirectDisplayID](repeating: 0, count: 16)
  var count: UInt32 = 0
  let error = CGGetOnlineDisplayList(UInt32(displays.count), &displays, &count)
  guard error == .success else {
    return []
  }

  return Array(displays.prefix(Int(count)))
}

private func firstBuiltInDisplay(at point: CGPoint) -> CGDirectDisplayID? {
  var matches = [CGDirectDisplayID](repeating: 0, count: 8)
  var count: UInt32 = 0
  let error = CGGetDisplaysWithPoint(point, UInt32(matches.count), &matches, &count)
  guard error == .success else {
    return nil
  }

  return matches.prefix(Int(count)).first(where: { CGDisplayIsBuiltin($0) != 0 })
}

private func targetDisplayID() -> CGDirectDisplayID {
  if let underCursor = firstBuiltInDisplay(at: NSEvent.mouseLocation) {
    return underCursor
  }

  let main = CGMainDisplayID()
  if CGDisplayIsBuiltin(main) != 0 {
    return main
  }

  fail(.noSupportedDisplay)
}

private func disableAutoBrightnessIfAvailable(for displayID: CGDirectDisplayID) {
  guard CGDisplayIsBuiltin(displayID) != 0 else {
    return
  }

  symbols.coreDisplaySetAutoBrightnessIsEnabled?(displayID, false)
}

private func servicePort(for displayID: CGDirectDisplayID) -> io_service_t? {
  let vendor = CGDisplayVendorNumber(displayID)
  let model = CGDisplayModelNumber(displayID)
  let serial = CGDisplaySerialNumber(displayID)

  guard let matching = IOServiceMatching("IODisplayConnect") else {
    return nil
  }

  var iterator: io_iterator_t = 0
  let result = IOServiceGetMatchingServices(kIOMainPortDefault, matching, &iterator)
  guard result == KERN_SUCCESS else {
    return nil
  }

  while case let service = IOIteratorNext(iterator), service != 0 {
    guard let info = IODisplayCreateInfoDictionary(service, IOOptionBits(kIODisplayNoProductName))?.takeRetainedValue()
      as? [String: Any] else {
      IOObjectRelease(service)
      continue
    }

    let vendorID = cfNumberValue(from: info[kDisplayVendorID as String])
    let productID = cfNumberValue(from: info[kDisplayProductID as String])
    let serialNumber = cfNumberValue(from: info[kDisplaySerialNumber as String])

    if cfNumberEqualsUInt32(vendorID, vendor) &&
      cfNumberEqualsUInt32(productID, model) &&
      cfNumberEqualsUInt32(serialNumber, serial) {
      IOObjectRelease(iterator)
      return service
    }

    IOObjectRelease(service)
  }

  IOObjectRelease(iterator)
  return nil
}

private func cfNumberEqualsUInt32(_ number: CFNumber?, _ value: UInt32) -> Bool {
  guard let number else {
    return value == 0
  }

  var int64Value: Int64 = 0
  guard CFNumberGetValue(number, .sInt64Type, &int64Value) else {
    return false
  }

  return int64Value == Int64(value)
}

private func cfNumberValue(from object: Any?) -> CFNumber? {
  guard let object else {
    return nil
  }

  let cfObject = object as CFTypeRef
  guard CFGetTypeID(cfObject) == CFNumberGetTypeID() else {
    return nil
  }

  return unsafeBitCast(cfObject, to: CFNumber.self)
}

private func getBrightness(displayID: CGDirectDisplayID, service: io_service_t?) -> Float? {
  if let getBrightness = symbols.displayServicesGetBrightness {
    var brightness: Float = 0
    if getBrightness(displayID, &brightness) == 0 {
      return brightness
    }
  }

  if let canChangeBrightness = symbols.displayServicesCanChangeBrightness,
     !canChangeBrightness(displayID) {
    return nil
  }

  if let getUserBrightness = symbols.coreDisplayGetUserBrightness {
    return Float(getUserBrightness(displayID))
  }

  guard let service else {
    return nil
  }

  var brightness: Float = 0
  let result = IODisplayGetFloatParameter(service, 0, kIODisplayBrightnessKey as CFString, &brightness)
  return result == kIOReturnSuccess ? brightness : nil
}

private func setBrightness(displayID: CGDirectDisplayID, service: io_service_t?, brightness: Float) -> Bool {
  if let setBrightness = symbols.displayServicesSetBrightness, setBrightness(displayID, brightness) == 0 {
    return true
  }

  if let canChangeBrightness = symbols.displayServicesCanChangeBrightness,
     !canChangeBrightness(displayID) {
    return false
  }

  if let setUserBrightness = symbols.coreDisplaySetUserBrightness {
    setUserBrightness(displayID, Double(brightness))
    symbols.displayServicesBrightnessChanged?(displayID, Double(brightness))
    return true
  }

  guard let service else {
    return false
  }

  let result = IODisplaySetFloatParameter(service, 0, kIODisplayBrightnessKey as CFString, brightness)
  return result == kIOReturnSuccess
}

let displayID = targetDisplayID()
let service = servicePort(for: displayID)
defer {
  if let service {
    IOObjectRelease(service)
  }
}
let command = parseCommand()

disableAutoBrightnessIfAvailable(for: displayID)

let targetBrightness: Float
switch command {
case .set(let brightness):
  targetBrightness = brightness
case .step(let delta):
  guard let currentBrightness = getBrightness(displayID: displayID, service: service) else {
    fail(.cannotReadBrightness(displayID))
  }

  targetBrightness = max(0, min(1, currentBrightness + delta))
}

guard setBrightness(displayID: displayID, service: service, brightness: targetBrightness) else {
  fail(.cannotSetBrightness(displayID))
}

guard let actualBrightness = getBrightness(displayID: displayID, service: service) else {
  fail(.cannotReadBrightness(displayID))
}

guard abs(actualBrightness - targetBrightness) <= tolerance else {
  fail(.verificationFailed(expected: targetBrightness, actual: actualBrightness))
}

emit(
  HelperResponse(
    status: "ok",
    brightness: Int((actualBrightness * 100).rounded()),
    displayID: hexDisplayID(displayID),
    message: nil
  ),
  exitCode: 0
)
