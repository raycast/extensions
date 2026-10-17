import XCTest
@testable import WindowSizerSwiftAPI

final class WindowResizePlacementTests: XCTestCase {
  private let screen = CGRect(x: 0, y: 30, width: 1440, height: 840)

  func testShrinkingFilledWindowPreservesItsCenter() {
    let size = CGSize(width: 1000, height: 600)
    let placement = WindowResizePlacement(windowFrame: screen, screenFrame: screen, targetSize: size)

    XCTAssertEqual(placement.position(for: size), CGPoint(x: 220, y: 150))
  }

  func testShrinkingOrdinaryWindowPreservesTopCenter() {
    let frame = CGRect(x: 200, y: 100, width: 1000, height: 600)
    let size = CGSize(width: 800, height: 400)
    let placement = WindowResizePlacement(windowFrame: frame, screenFrame: screen, targetSize: size)

    XCTAssertEqual(placement.position(for: size), CGPoint(x: 300, y: 100))
  }

  func testSubsequentResizeUsesTopCenter() {
    let firstSize = CGSize(width: 1000, height: 600)
    let first = WindowResizePlacement(windowFrame: screen, screenFrame: screen, targetSize: firstSize)
    let frame = CGRect(origin: first.position(for: firstSize), size: firstSize)
    let nextSize = CGSize(width: 800, height: 400)
    let next = WindowResizePlacement(windowFrame: frame, screenFrame: screen, targetSize: nextSize)

    XCTAssertEqual(next.position(for: nextSize), CGPoint(x: 320, y: 150))
  }

  func testGrowingNearEdgeMovesWindowInsideScreen() {
    let frame = CGRect(x: 1000, y: 600, width: 400, height: 250)
    let size = CGSize(width: 1000, height: 600)
    let placement = WindowResizePlacement(windowFrame: frame, screenFrame: screen, targetSize: size)

    XCTAssertEqual(placement.position(for: size), CGPoint(x: 440, y: 270))
  }

  func testFullWidthOrHeightAloneDoesNotTriggerCentering() {
    let size = CGSize(width: 800, height: 400)
    for frame in [
      CGRect(x: 0, y: 30, width: 1440, height: 600),
      CGRect(x: 100, y: 30, width: 1000, height: 840),
      CGRect(x: 0, y: 50, width: 1440, height: 840),
    ] {
      let placement = WindowResizePlacement(windowFrame: frame, screenFrame: screen, targetSize: size)
      XCTAssertEqual(placement.position(for: size).y, frame.minY)
    }
  }

  func testSmallFrameRoundingDifferencesPreserveOriginalCenter() {
    let frame = CGRect(x: 1, y: 32, width: 1438, height: 839)
    let size = CGSize(width: 1000, height: 600)
    let placement = WindowResizePlacement(windowFrame: frame, screenFrame: screen, targetSize: size)

    XCTAssertEqual(placement.position(for: size), CGPoint(x: frame.midX - 500, y: frame.midY - 300))
  }

  func testShrinkingOnlyOneDimensionOfFilledWindow() {
    for size in [CGSize(width: 1440, height: 600), CGSize(width: 1000, height: 840)] {
      let placement = WindowResizePlacement(windowFrame: screen, screenFrame: screen, targetSize: size)
      let resized = CGRect(origin: placement.position(for: size), size: size)

      XCTAssertEqual(resized.midX, screen.midX)
      XCTAssertEqual(resized.midY, screen.midY)
    }
  }

  func testGrowingOrdinaryWindowPreservesTopCenterWhenItFits() {
    let frame = CGRect(x: 400, y: 200, width: 400, height: 300)
    let size = CGSize(width: 800, height: 600)
    let placement = WindowResizePlacement(windowFrame: frame, screenFrame: screen, targetSize: size)

    XCTAssertEqual(placement.position(for: size), CGPoint(x: 200, y: 200))
  }

  func testWindowAlreadyOutsideScreenMovesBackInside() {
    let frame = CGRect(x: -300, y: 0, width: 800, height: 600)
    let size = CGSize(width: 600, height: 400)
    let placement = WindowResizePlacement(windowFrame: frame, screenFrame: screen, targetSize: size)

    XCTAssertEqual(placement.position(for: size), CGPoint(x: 0, y: 30))
  }

  func testSecondaryScreenWithNegativeOrigin() {
    let secondary = CGRect(x: -1920, y: -1050, width: 1920, height: 1020)
    let size = CGSize(width: 1280, height: 720)
    let placement = WindowResizePlacement(
      windowFrame: secondary, screenFrame: secondary, targetSize: size)

    XCTAssertEqual(placement.position(for: size), CGPoint(x: -1600, y: -900))
  }

  func testActualAppSizeUsesSameCenteringRule() {
    let placement = WindowResizePlacement(
      windowFrame: screen, screenFrame: screen, targetSize: CGSize(width: 400, height: 300))

    XCTAssertEqual(placement.position(for: CGSize(width: 800, height: 600)), CGPoint(x: 320, y: 150))
  }

  func testRestoringPositionOverridesCentering() {
    let size = CGSize(width: 1000, height: 600)
    let placement = WindowResizePlacement(
      windowFrame: screen, screenFrame: screen, targetSize: size,
      preservedPosition: CGPoint(x: 100, y: 80))

    XCTAssertEqual(placement.position(for: size), CGPoint(x: 100, y: 80))
  }
}
