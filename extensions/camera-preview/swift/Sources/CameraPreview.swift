import AVFoundation
import Foundation
import RaycastSwiftMacros

/// Set on the detached child process so it knows to render the window instead of spawning again.
let childProcessMarker = "RAYCAST_CAMERA_PREVIEW_CHILD"

struct CameraPreviewError: LocalizedError, CustomStringConvertible {
  let description: String
  var errorDescription: String? { description }

  static let accessDenied = Self(
    description:
      "Camera access is denied. Enable Raycast under System Settings › Privacy & Security › Camera."
  )
  static let noDevice = Self(description: "No camera device was found.")
}

struct CameraInfo: Encodable {
  let id: String
  let name: String
}

/// Lists the connected cameras so the user can pick a default one in Raycast.
@raycast func listCameras() async throws -> [CameraInfo] {
  guard await hasCameraAccess() else { throw CameraPreviewError.accessDenied }
  return discoverDevices().map { CameraInfo(id: $0.uniqueID, name: $0.localizedName) }
}

/// Opens the preview window and returns immediately.
///
/// The window has to outlive the Raycast command, so the work happens in a detached copy of this
/// executable. The parent validates permissions and devices first so failures surface in Raycast.
@raycast func showCameraPreview(
  mirror: Bool,
  fill: Bool,
  cameraId: String,
  cameraType: String,
  windowSize: String
) async throws {
  if ProcessInfo.processInfo.environment[childProcessMarker] != nil {
    // Detach from Raycast's process group so the window survives the command finishing.
    setsid()
    // Never returns.
    await runPreviewApp(
      mirror: mirror,
      fill: fill,
      cameraId: cameraId,
      cameraType: CameraType(preference: cameraType),
      windowSize: windowSize
    )
  }

  guard await hasCameraAccess() else { throw CameraPreviewError.accessDenied }
  guard !discoverDevices().isEmpty else { throw CameraPreviewError.noDevice }

  try spawnPreviewProcess()
}

/// Requests camera access on first run. The permission is granted to Raycast, the parent app.
func hasCameraAccess() async -> Bool {
  switch AVCaptureDevice.authorizationStatus(for: .video) {
  case .authorized: return true
  case .notDetermined: return await AVCaptureDevice.requestAccess(for: .video)
  default: return false
  }
}

/// Which camera the preview starts with, as chosen in the extension preferences.
enum CameraType: String {
  /// Use the camera picked with the "Select Default Camera" command.
  case selected
  case builtIn
  case external
  case continuity

  init(preference: String) {
    self = CameraType(rawValue: preference) ?? .selected
  }

  func matches(_ device: AVCaptureDevice) -> Bool {
    switch self {
    case .selected:
      false
    case .builtIn:
      device.deviceType == .builtInWideAngleCamera
    case .external:
      if #available(macOS 14.0, *) { device.deviceType == .external } else { false }
    case .continuity:
      if #available(macOS 14.0, *) { device.deviceType == .continuityCamera } else { false }
    }
  }
}

func discoverDevices() -> [AVCaptureDevice] {
  var deviceTypes: [AVCaptureDevice.DeviceType] = [.builtInWideAngleCamera]
  if #available(macOS 14.0, *) {
    deviceTypes.append(contentsOf: [.external, .continuityCamera])
  }
  return AVCaptureDevice.DiscoverySession(
    deviceTypes: deviceTypes,
    mediaType: .video,
    position: .unspecified
  ).devices
}

/// Re-launches this same executable with the same arguments, flagged as the child.
func spawnPreviewProcess() throws {
  let process = Process()
  process.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
  process.arguments = Array(CommandLine.arguments.dropFirst())

  var environment = ProcessInfo.processInfo.environment
  environment[childProcessMarker] = "1"
  process.environment = environment

  process.standardInput = FileHandle.nullDevice
  process.standardOutput = FileHandle.nullDevice
  process.standardError = FileHandle.nullDevice

  try process.run()
}
