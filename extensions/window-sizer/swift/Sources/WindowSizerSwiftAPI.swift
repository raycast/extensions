import AppKit
import ApplicationServices
import CoreGraphics
import Foundation
import RaycastSwiftMacros

// Screen information cache
private var singleScreenInfoCache: String? = nil
private var lastScreenCount: Int = 0

// Check if current application is desktop (Finder with no active windows)
private func isDesktopOrFullscreen() -> (isDesktopOrFullscreen: Bool, message: String?) {
  // Get current frontmost application
  guard let frontApp = NSWorkspace.shared.frontmostApplication else {
    return (true, "Could not get frontmost application")
  }

  let appBundleID = frontApp.bundleIdentifier ?? "unknown"

  // First check: Is it Finder?
  let isFinder = appBundleID == "com.apple.finder"
  if !isFinder {
    // Not Finder, so not desktop
    return (false, nil)
  }

  // Create AXUIElement for the application
  let appRef = AXUIElementCreateApplication(frontApp.processIdentifier)

  // Get the application's focused window
  var windowRef: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(
    appRef, kAXFocusedWindowAttribute as CFString, &windowRef)

  // If we can't get a window reference, something is wrong
  guard result == .success, let windowRef = windowRef else {
    return (true, "Cannot get Finder window reference")
  }

  // Cast windowRef to AXUIElement for further inspection
  let axWindowRef = windowRef as! AXUIElement

  // Get window title if available
  var windowTitle: CFTypeRef?
  AXUIElementCopyAttributeValue(axWindowRef, kAXTitleAttribute as CFString, &windowTitle)
  let title = (windowTitle as? String) ?? ""

  // Desktop window check based on title
  if title.isEmpty {
    // Finder window with empty title is likely desktop
    return (true, "Finder with empty title detected (desktop)")
  }

  // If none of the desktop indicators matched, it's a regular Finder window
  return (false, nil)
}

// Define a proper Codable structure for window information
struct WindowPosition: Codable {
  let x: Int
  let y: Int
}

struct WindowSize: Codable {
  let width: Int
  let height: Int
}

struct WindowInfo: Codable {
  let position: WindowPosition
  let size: WindowSize
}

struct AppInfo: Codable {
  let name: String
  let processID: Int
}

struct WindowDetails: Codable {
  let error: Bool
  let message: String?
  let windowRefID: String?
  let window: WindowInfo?
  let app: AppInfo?
}

// Define ResizeResult structure to ensure type compatibility with JavaScript
struct ResizeResult: Codable {
  let success: Bool
  let width: Int
  let height: Int
  let x: Int
  let y: Int
  let requestedWidth: Int
  let requestedHeight: Int
  let message: String?
}

// Helper function to get screen info string
private func getScreenInfoString(screenIndex: Int, screen: NSScreen) -> String {
  let frame = screen.visibleFrame
  return
    "\(screenIndex):\(Int(frame.origin.x)),\(Int(frame.origin.y)),\(Int(frame.width)),\(Int(frame.height))"
}

// Shared function: Get active window basic data
private func getActiveWindowData() -> (
  success: Bool,
  axWindowRef: AXUIElement?,
  windowPosition: CGPoint,
  windowSize: CGSize,
  appName: String
) {
  // Default return value
  let defaultResult = (
    success: false, axWindowRef: nil as AXUIElement?, windowPosition: CGPoint.zero,
    windowSize: CGSize.zero, appName: "unknown"
  )

  // Get current active application
  guard let frontApp = NSWorkspace.shared.frontmostApplication else {
    return defaultResult
  }

  // Create AXUIElement for the application
  let appRef = AXUIElementCreateApplication(frontApp.processIdentifier)

  // Get the application's focused window
  var windowRef: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(
    appRef, kAXFocusedWindowAttribute as CFString, &windowRef)

  guard result == .success, let windowRef = windowRef else {
    return defaultResult
  }

  // Cast windowRef to AXUIElement for use in subsequent calls
  let axWindowRef = windowRef as! AXUIElement  // Force cast is safe here because we know it's an AXUIElement

  // Get window position
  var position: CFTypeRef?
  AXUIElementCopyAttributeValue(
    axWindowRef, kAXPositionAttribute as CFString, &position)

  guard let position = position else {
    return defaultResult
  }

  // Convert AXValue to CGPoint
  var windowPosition = CGPoint.zero
  AXValueGetValue(position as! AXValue, .cgPoint, &windowPosition)

  // Get window size
  var size: CFTypeRef?
  AXUIElementCopyAttributeValue(axWindowRef, kAXSizeAttribute as CFString, &size)

  guard let size = size else {
    return defaultResult
  }

  // Convert AXValue to CGSize
  var windowSize = CGSize.zero
  AXValueGetValue(size as! AXValue, .cgSize, &windowSize)

  // Get app name directly from frontmost application
  let appName = frontApp.localizedName ?? "unknown"

  return (
    success: true, axWindowRef: axWindowRef, windowPosition: windowPosition, windowSize: windowSize,
    appName: appName
  )
}

private func isLaunchedByRaycast() -> Bool {
  let env = ProcessInfo.processInfo.environment
  return env.keys.contains(where: { $0.hasPrefix("RAYCAST_") })
}

@raycast func getScreensInfo() -> [String] {
  guard isLaunchedByRaycast() else {
    return ["Error: This command must be run from Raycast"]
  }

  let screens = NSScreen.screens
  var results: [String] = []
  for (index, screen) in screens.enumerated() {
    results.append(getScreenInfoString(screenIndex: index, screen: screen))
  }

  return results
}

// Get window number
private func getWindowNumber(processId: pid_t) -> Int? {
  let windowList =
    CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]]

  // Find windows belonging to the current process
  let processWindows = windowList?.filter { window in
    if let windowPid = window[kCGWindowOwnerPID as String] as? pid_t {
      return windowPid == processId
    }
    return false
  }

  // Get the window number of the first window
  if let firstWindow = processWindows?.first,
    let windowNumber = firstWindow[kCGWindowNumber as String] as? Int
  {
    return windowNumber
  }

  return nil
}

// Export active window information as structured data for direct use by JavaScript
@raycast func getActiveWindowInfo() -> WindowDetails {
  // Check if current window is desktop or fullscreen
  let desktopOrFullscreenCheck = isDesktopOrFullscreen()
  if desktopOrFullscreenCheck.isDesktopOrFullscreen {
    return WindowDetails(
      error: true,
      message: desktopOrFullscreenCheck.message ?? "No focused window",
      windowRefID: nil,
      window: nil,
      app: nil
    )
  }

  // Default error result
  let errorResult = WindowDetails(
    error: true,
    message: "No active window information",
    windowRefID: nil,
    window: nil,
    app: nil
  )

  // Get active window data
  let windowData = getActiveWindowData()
  if !windowData.success || windowData.axWindowRef == nil {
    return errorResult
  }

  // Get window number
  let processId = NSWorkspace.shared.frontmostApplication?.processIdentifier ?? 0
  let windowNumber = getWindowNumber(processId: processId)

  // Create window info
  let position = WindowPosition(
    x: Int(windowData.windowPosition.x),
    y: Int(windowData.windowPosition.y)
  )

  let size = WindowSize(
    width: Int(windowData.windowSize.width),
    height: Int(windowData.windowSize.height)
  )

  let windowInfo = WindowInfo(
    position: position,
    size: size
  )

  let appInfo = AppInfo(
    name: windowData.appName,
    processID: Int(processId)
  )

  // Return structured data that can be converted to JSON
  return WindowDetails(
    error: false,
    message: nil,
    windowRefID: windowNumber?.description,
    window: windowInfo,
    app: appInfo
  )
}

// Get screen information in AX coordinates (top-left origin)
private func getScreenInfoInAXCoordinates() -> [(index: Int, frame: CGRect)] {
  let screens = NSScreen.screens
  var results: [(index: Int, frame: CGRect)] = []

  // Main screen height - needed for coordinate conversion
  let mainScreenHeight = NSScreen.main?.frame.height ?? 0

  for (index, screen) in screens.enumerated() {
    // Convert Cocoa coordinates (bottom-left origin) to AX coordinates (top-left origin)
    let cocoaFrame = screen.frame

    // Convert to AX coordinates
    let axOriginX = cocoaFrame.origin.x
    let axOriginY = mainScreenHeight - (cocoaFrame.origin.y + cocoaFrame.height)
    let axFrame = CGRect(
      x: axOriginX,
      y: axOriginY,
      width: cocoaFrame.width,
      height: cocoaFrame.height
    )

    results.append((index: index, frame: axFrame))
  }

  return results
}

// Get the screen info of the current active window using Accessibility API
@raycast func getActiveWindowScreenInfo() -> String {
  let screens = NSScreen.screens

  // If no screens available, return error
  if screens.isEmpty {
    return "Error: No screens available"
  }

  // Get active window data
  let windowData = getActiveWindowData()
  if !windowData.success || windowData.axWindowRef == nil {
    return "Error: Unable to get active window information"
  }

  // Special case for single screen - simple approach
  if screens.count == 1 {
    let screenInfo = getScreenInfoString(screenIndex: 0, screen: screens[0])
    return screenInfo
      + ":\(Int(windowData.windowPosition.x)),\(Int(windowData.windowPosition.y)),\(Int(windowData.windowSize.width)),\(Int(windowData.windowSize.height))"
  }

  // Get all screens in AX coordinates
  let axScreens = getScreenInfoInAXCoordinates()

  // Get window rectangle in AX coordinates (already in AX coordinates from AXUIElement)
  let windowRect = CGRect(
    x: windowData.windowPosition.x,
    y: windowData.windowPosition.y,
    width: windowData.windowSize.width,
    height: windowData.windowSize.height
  )

  let windowCenter = CGPoint(
    x: windowRect.midX,
    y: windowRect.midY
  )

  // Find which screen contains window center point using AX coordinates
  for axScreen in axScreens {
    let screenInAX = axScreen.frame
    let isInScreen = screenInAX.contains(windowCenter)

    if isInScreen {
      let screenInfo = getScreenInfoString(
        screenIndex: axScreen.index, screen: screens[axScreen.index])
      return screenInfo
        + ":\(Int(windowData.windowPosition.x)),\(Int(windowData.windowPosition.y)),\(Int(windowData.windowSize.width)),\(Int(windowData.windowSize.height))"
    }
  }

  // If no screen contains the window, return error
  return
    "Error: Cannot determine screen for window. Window center is not within any screen in AX coordinates."
}

// Helper function to parse window screen info string
// This needs to use AX coordinates consistently
private func parseWindowScreenInfo() -> (
  screenIndex: Int, screenFrame: NSRect, windowX: Int, windowY: Int, windowWidth: Int,
  windowHeight: Int
)? {
  let screens = NSScreen.screens

  // Get window and screen information
  let windowScreenInfo = getActiveWindowScreenInfo()

  // Check for errors
  if windowScreenInfo.starts(with: "Error:") {
    return nil
  }

  // Parse the info string
  // Format: "screenIndex:screenX,screenY,screenWidth,screenHeight:windowX,windowY,windowWidth,windowHeight"
  let parts = windowScreenInfo.split(separator: ":")
  guard parts.count >= 3 else {
    return nil
  }

  // Get screen index
  guard let screenIndex = Int(parts[0]) else {
    return nil
  }

  // Ensure screen index is valid
  guard screenIndex >= 0 && screenIndex < screens.count else {
    return nil
  }

  // Parse window position and size
  let windowCoords = parts[2].split(separator: ",")
  guard windowCoords.count >= 4,
    let windowX = Int(windowCoords[0]),
    let windowY = Int(windowCoords[1]),
    let windowWidth = Int(windowCoords[2]),
    let windowHeight = Int(windowCoords[3])
  else {
    return nil
  }

  // Get the screen's visible frame IN AX COORDINATES
  let visibleFrame = screens[screenIndex].visibleFrame
  let mainScreenHeight = NSScreen.main?.frame.height ?? 0

  // Convert to AX coordinates
  let axFrameX = visibleFrame.origin.x
  let axFrameY = mainScreenHeight - (visibleFrame.origin.y + visibleFrame.height)
  let axFrame = CGRect(
    x: axFrameX,
    y: axFrameY,
    width: visibleFrame.width,
    height: visibleFrame.height
  )

  return (screenIndex, axFrame, windowX, windowY, windowWidth, windowHeight)
}

// Helper function to set window position and size
private func setWindowPositionAndSize(windowRef: AXUIElement, position: CGPoint, size: CGSize) {
  // Set new position
  var newPosition = position
  let axPosition = AXValueCreate(.cgPoint, &newPosition)!
  AXUIElementSetAttributeValue(windowRef, kAXPositionAttribute as CFString, axPosition)

  // Set new size
  var newSize = size
  let axSize = AXValueCreate(.cgSize, &newSize)!
  AXUIElementSetAttributeValue(windowRef, kAXSizeAttribute as CFString, axSize)
}

// Helper function to get active window reference
private func getActiveWindowRef() -> AXUIElement? {
  let windowInfo = getActiveWindowInfo()
  if windowInfo.error {
    return nil
  }

  // We need to get the active window a different way since we no longer store the AXUIElement directly
  // Get active window data
  let windowData = getActiveWindowData()
  if !windowData.success {
    return nil
  }

  return windowData.axWindowRef
}

// Maximize the active window on its current screen
@raycast func maximizeActiveWindow() -> String {
  // Parse window and screen info
  guard let info = parseWindowScreenInfo(),
    let windowRef = getActiveWindowRef()
  else {
    return "Error: No active window"
  }

  // Check if window is already maximized
  let windowWidth = CGFloat(info.windowWidth)
  let windowHeight = CGFloat(info.windowHeight)
  let screenWidth = info.screenFrame.width
  let screenHeight = info.screenFrame.height

  // Add small tolerance for comparison
  let tolerance: CGFloat = 5.0
  if abs(windowWidth - screenWidth) <= tolerance && abs(windowHeight - screenHeight) <= tolerance {
    return "Already maximized"
  }

  // Set window position (top-left corner of the screen) and size (screen dimensions)
  let newPosition = CGPoint(x: info.screenFrame.origin.x, y: info.screenFrame.origin.y)
  let newSize = CGSize(width: info.screenFrame.width, height: info.screenFrame.height)
  setWindowPositionAndSize(windowRef: windowRef, position: newPosition, size: newSize)

  return "Success"
}

// Resize window to target size, intelligently repositioning if needed to keep it within screen bounds
@raycast func resizeWindow(
  windowRefID: String? = nil, targetWidth: Double, targetHeight: Double, windowX: Double? = nil,
  windowY: Double? = nil, windowWidth: Double? = nil, windowHeight: Double? = nil,
  screenFrame: NSRect? = nil, windowInfo: WindowDetails? = nil, preservePosition: Bool = false
) -> ResizeResult {
  // Check if current window is desktop or fullscreen
  let desktopOrFullscreenCheck = isDesktopOrFullscreen()
  if desktopOrFullscreenCheck.isDesktopOrFullscreen {
    return ResizeResult(
      success: false,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      requestedWidth: Int(targetWidth),
      requestedHeight: Int(targetHeight),
      message: desktopOrFullscreenCheck.message ?? "No focused window"
    )
  }

  // Get window reference based on windowRefID or use active window
  var windowRef: AXUIElement?

  if let refID = windowRefID, let pointer = UnsafeRawPointer(bitPattern: Int(refID) ?? 0) {
    windowRef = Unmanaged<AXUIElement>.fromOpaque(pointer).takeUnretainedValue()
  } else {
    // Fallback to active window if no windowRefID provided
    windowRef = getActiveWindowRef()
  }

  guard let windowRef = windowRef else {
    return ResizeResult(
      success: false,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      requestedWidth: Int(targetWidth),
      requestedHeight: Int(targetHeight),
      message: "Failed to get window reference"
    )
  }

  // Use provided screen and window info if available, otherwise parse from active window
  var currentX: CGFloat
  var currentY: CGFloat
  var currentWidth: CGFloat
  var currentScreenFrame: CGRect

  if let wx = windowX, let wy = windowY, let ww = windowWidth, windowHeight != nil,
    let sf = screenFrame
  {
    // Use provided values - assume they're already in AX coordinates
    currentX = CGFloat(wx)
    currentY = CGFloat(wy)
    currentWidth = CGFloat(ww)
    currentScreenFrame = sf
  } else {
    // Parse from active window - these will be in AX coordinates
    guard let info = parseWindowScreenInfo() else {
      return ResizeResult(
        success: false,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        requestedWidth: Int(targetWidth),
        requestedHeight: Int(targetHeight),
        message: "Failed to get window/screen information"
      )
    }
    currentX = CGFloat(info.windowX)
    currentY = CGFloat(info.windowY)
    currentWidth = CGFloat(info.windowWidth)
    currentScreenFrame = info.screenFrame
  }

  // Target window size
  var newWidth = CGFloat(targetWidth)
  var newHeight = CGFloat(targetHeight)

  // Store original requested dimensions for comparison
  let requestedWidth = newWidth
  let requestedHeight = newHeight

  // Calculate new position (in AX coordinates)
  var newX: CGFloat
  var newY: CGFloat

  if preservePosition && windowX != nil && windowY != nil {
    // Preserve exact position as requested
    newX = CGFloat(windowX!)
    newY = CGFloat(windowY!)
  } else {
    // Calculate window center point on X axis (in AX coordinates)
    let centerX = currentX + currentWidth / 2

    // Center horizontally, keep Y position the same
    newX = centerX - newWidth / 2
    newY = currentY  // Keep Y position unchanged
  }

  // Adjust dimensions if they exceed screen boundaries
  if newWidth > currentScreenFrame.width {
    newWidth = currentScreenFrame.width
  }

  if newHeight > currentScreenFrame.height {
    newHeight = currentScreenFrame.height
  }

  // Ensure position is within screen boundaries
  if newX < currentScreenFrame.minX {
    newX = currentScreenFrame.minX
  } else if newX + newWidth > currentScreenFrame.maxX {
    newX = currentScreenFrame.maxX - newWidth
  }

  if newY < currentScreenFrame.minY {
    newY = currentScreenFrame.minY
  } else if newY + newHeight > currentScreenFrame.maxY {
    newY = currentScreenFrame.maxY - newHeight
  }

  // Set new window position and size (using AX coordinates, which is what the AX API expects)
  let position = CGPoint(x: newX, y: newY)
  let size = CGSize(width: newWidth, height: newHeight)
  setWindowPositionAndSize(windowRef: windowRef, position: position, size: size)

  // Verify window was successfully resized
  let windowData = getActiveWindowData()
  if !windowData.success {
    return ResizeResult(
      success: false,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      requestedWidth: Int(requestedWidth),
      requestedHeight: Int(requestedHeight),
      message: "Failed to verify window size change"
    )
  }

  // Use reasonable tolerance for size validation
  let sizeTolerance: CGFloat = 5.0

  // Check if window size differs significantly from requested size
  let widthDiffers = abs(windowData.windowSize.width - newWidth) > sizeTolerance
  let heightDiffers = abs(windowData.windowSize.height - newHeight) > sizeTolerance

  // Determine if any dimension differs significantly from requested
  let sizeDiffers = widthDiffers || heightDiffers

  // Final position and size values to use in the result
  var finalPositionX = windowData.windowPosition.x
  var finalPositionY = windowData.windowPosition.y
  let finalWidth = windowData.windowSize.width
  let finalHeight = windowData.windowSize.height

  // If actual size differs from requested size and not preserving position, recalculate position
  if sizeDiffers && !preservePosition {
    // For X coordinate: center horizontally based on original center
    let centerX = currentX + currentWidth / 2
    var adjustedX = centerX - finalWidth / 2

    // For Y coordinate: keep top edge aligned with original top edge
    var adjustedY = currentY  // Keep top edge aligned

    // Ensure adjusted position is within screen boundaries
    if adjustedX < currentScreenFrame.minX {
      adjustedX = currentScreenFrame.minX
    } else if adjustedX + finalWidth > currentScreenFrame.maxX {
      adjustedX = currentScreenFrame.maxX - finalWidth
    }

    if adjustedY < currentScreenFrame.minY {
      adjustedY = currentScreenFrame.minY
    } else if adjustedY + finalHeight > currentScreenFrame.maxY {
      adjustedY = currentScreenFrame.maxY - finalHeight
    }

    // Apply adjusted position if it's different from current position
    if abs(adjustedX - windowData.windowPosition.x) > 1.0
      || abs(adjustedY - windowData.windowPosition.y) > 1.0
    {
      var adjustedPosition = CGPoint(x: adjustedX, y: adjustedY)
      let axAdjustedPosition = AXValueCreate(.cgPoint, &adjustedPosition)!
      AXUIElementSetAttributeValue(windowRef, kAXPositionAttribute as CFString, axAdjustedPosition)

      // Get final window data after adjustment
      let finalCheckData = getActiveWindowData()
      if finalCheckData.success {
        // Update our final position variables
        finalPositionX = finalCheckData.windowPosition.x
        finalPositionY = finalCheckData.windowPosition.y
      }
    }
  }

  // Focus on size validation primarily - position is less critical
  let sizeOk =
    abs(finalWidth - size.width) <= sizeTolerance
    && abs(finalHeight - size.height) <= sizeTolerance

  // For success, we focus only on size being correct
  let success = sizeOk

  // Return result with actual window dimensions (in AX coordinates)
  return ResizeResult(
    success: success,
    width: Int(finalWidth),
    height: Int(finalHeight),
    x: Int(finalPositionX),
    y: Int(finalPositionY),
    requestedWidth: Int(requestedWidth),
    requestedHeight: Int(requestedHeight),
    message: nil
  )
}
