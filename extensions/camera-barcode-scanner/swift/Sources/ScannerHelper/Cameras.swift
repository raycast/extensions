import AVFoundation

enum Cameras {
  static func discover() -> [AVCaptureDevice] {
    let types: [AVCaptureDevice.DeviceType] = [.builtInWideAngleCamera, .continuityCamera, .external]
    let found = AVCaptureDevice.DiscoverySession(
      deviceTypes: types, mediaType: .video, position: .unspecified
    ).devices
    return found.enumerated().sorted {
      rank($0.element) != rank($1.element) ? rank($0.element) < rank($1.element) : $0.offset < $1.offset
    }.map(\.element)
  }

  /// An iPhone also arrives as `.external` with an `iPhone…` model id when the host app lacks
  /// `NSCameraUseContinuityCameraDeviceType` (Raycast does), under the phone's own name.
  static func isContinuity(_ device: AVCaptureDevice) -> Bool {
    if device.deviceType == .continuityCamera { return true }
    return device.modelID.lowercased().hasPrefix("iphone")
  }

  static func isBuiltIn(_ device: AVCaptureDevice) -> Bool {
    device.deviceType == .builtInWideAngleCamera
  }

  private static let virtualNames = [
    "obs", "virtual", "snap", "mmhmm", "camo", "manycam", "ndi", "zoom", "droidcam", "epoccam",
  ]

  /// True for software cameras. They have no physical transport or carry a known virtual name.
  static func isVirtual(_ device: AVCaptureDevice) -> Bool {
    if isBuiltIn(device) || isContinuity(device) { return false }
    let name = device.localizedName.lowercased()
    let vendor = (device.manufacturer + " " + device.modelID).lowercased()
    if virtualNames.contains(where: { name.contains($0) || vendor.contains($0) }) { return true }
    let virtualTransport = Int32(bitPattern: 0x7669_7274) // 'virt'
    return device.transportType == 0 || device.transportType == virtualTransport
  }

  /// Auto order: Continuity, built-in, real external, anything else, virtual last.
  static func rank(_ device: AVCaptureDevice) -> Int {
    if isContinuity(device) { return 0 }
    if isBuiltIn(device) { return 1 }
    if isVirtual(device) { return 4 }
    if device.deviceType == .external { return 2 }
    return 3
  }

  /// Picks the default device for the camera option. Virtual cameras come last in every mode.
  static func pick(from devices: [AVCaptureDevice], option: String) -> AVCaptureDevice? {
    let ranked = devices.enumerated().sorted {
      rank($0.element) != rank($1.element) ? rank($0.element) < rank($1.element) : $0.offset < $1.offset
    }.map(\.element)
    switch option {
    case "continuity": return ranked.first(where: isContinuity) ?? ranked.first
    case "builtin": return ranked.first(where: isBuiltIn) ?? ranked.first
    default: return ranked.first
    }
  }

  /// Throws a plain error when the camera cannot be used. Does not prompt.
  static func checkAvailable(option: String) throws {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .denied, .restricted:
      throw ScannerError(ScannerError.camera)
    default: break
    }
    if pick(from: discover(), option: option) == nil {
      throw ScannerError(ScannerError.noCamera)
    }
  }
}
