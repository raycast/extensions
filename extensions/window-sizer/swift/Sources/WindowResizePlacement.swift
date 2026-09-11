import Foundation

// Computes placement in AX coordinates, independently of window accessibility operations.
struct WindowResizePlacement {
  private let windowFrame: CGRect
  private let screenFrame: CGRect
  private let preservedPosition: CGPoint?
  private let centerVertically: Bool

  init(
    windowFrame: CGRect, screenFrame: CGRect, targetSize: CGSize,
    preservedPosition: CGPoint? = nil
  ) {
    self.windowFrame = windowFrame
    self.screenFrame = screenFrame
    self.preservedPosition = preservedPosition

    // Match both location and size; full width or full height alone is not maximized.
    let tolerance: CGFloat = 5
    let fillsScreen =
      abs(windowFrame.minX - screenFrame.minX) <= tolerance
      && abs(windowFrame.minY - screenFrame.minY) <= tolerance
      && abs(windowFrame.width - screenFrame.width) <= tolerance
      && abs(windowFrame.height - screenFrame.height) <= tolerance
    let isShrinking =
      targetSize.width <= windowFrame.width + tolerance
      && targetSize.height <= windowFrame.height + tolerance
      && (targetSize.width < windowFrame.width || targetSize.height < windowFrame.height)
    centerVertically = fillsScreen && isShrinking
  }

  func position(for size: CGSize) -> CGPoint {
    let position = preservedPosition ?? CGPoint(
      x: windowFrame.midX - size.width / 2,
      y: centerVertically ? windowFrame.midY - size.height / 2 : windowFrame.minY
    )
    return CGPoint(
      x: max(screenFrame.minX, min(position.x, screenFrame.maxX - size.width)),
      y: max(screenFrame.minY, min(position.y, screenFrame.maxY - size.height))
    )
  }
}
