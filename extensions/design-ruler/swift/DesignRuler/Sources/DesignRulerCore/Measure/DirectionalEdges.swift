import Foundation

package struct EdgeHit {
    package let distance: CGFloat        // points from cursor to edge
    package let screenPosition: CGFloat  // absolute screen coord (AX coords)
    package let borderAbsorbed: Bool     // true if a 1px border was absorbed into this measurement

    package init(distance: CGFloat, screenPosition: CGFloat, borderAbsorbed: Bool = false) {
        self.distance = distance
        self.screenPosition = screenPosition
        self.borderAbsorbed = borderAbsorbed
    }
}

package struct DirectionalEdges {
    package let cursorPosition: CGPoint  // AX coords
    package let left: EdgeHit?
    package let right: EdgeHit?
    package let top: EdgeHit?
    package let bottom: EdgeHit?

    /// The edge in `direction`, nil when the line runs to the screen edge.
    package func edge(_ direction: EdgeDetector.Direction) -> EdgeHit? {
        switch direction {
        case .left:   return left
        case .right:  return right
        case .top:    return top
        case .bottom: return bottom
        }
    }
}
