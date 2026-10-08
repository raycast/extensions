import Foundation

package class ColorMap {
    package let width: Int
    package let height: Int
    package let pixels: [UInt8]  // RGBA, 4 bytes per pixel
    package let screenFrame: CGRect  // AX coords: which screen area this covers
    package let scale: CGFloat  // pixel-to-point ratio (2.0 on Retina)

    package init(width: Int, height: Int, pixels: [UInt8], screenFrame: CGRect) {
        self.width = width
        self.height = height
        self.pixels = pixels
        self.screenFrame = screenFrame
        self.scale = CGFloat(width) / screenFrame.width
    }

    /// Scan from a screen point (AX coords) in 4 cardinal directions.
    package func scan(from point: CGPoint, tolerance: UInt8 = 1,
              skipLeft: Int = 0, skipRight: Int = 0,
              skipTop: Int = 0, skipBottom: Int = 0,
              includeBorders: Bool = true) -> DirectionalEdges {
        let px = min(max(Int((point.x - screenFrame.origin.x) * scale), 0), width - 1)
        let py = min(max(Int((point.y - screenFrame.origin.y) * scale), 0), height - 1)

        let refIdx = (py * width + px) * 4
        let refR = pixels[refIdx]
        let refG = pixels[refIdx + 1]
        let refB = pixels[refIdx + 2]

        let leftHit = scanDirection(fromX: px, fromY: py, dx: -1, dy: 0,
                                     refR: refR, refG: refG, refB: refB,
                                     tolerance: tolerance, skipCount: skipLeft,
                                     includeBorders: includeBorders)
        let rightHit = scanDirection(fromX: px, fromY: py, dx: 1, dy: 0,
                                      refR: refR, refG: refG, refB: refB,
                                      tolerance: tolerance, skipCount: skipRight,
                                      includeBorders: includeBorders)
        let topHit = scanDirection(fromX: px, fromY: py, dx: 0, dy: -1,
                                    refR: refR, refG: refG, refB: refB,
                                    tolerance: tolerance, skipCount: skipTop,
                                    includeBorders: includeBorders)
        let bottomHit = scanDirection(fromX: px, fromY: py, dx: 0, dy: 1,
                                       refR: refR, refG: refG, refB: refB,
                                       tolerance: tolerance, skipCount: skipBottom,
                                       includeBorders: includeBorders)

        return DirectionalEdges(cursorPosition: point,
                                left: leftHit, right: rightHit,
                                top: topHit, bottom: bottomHit)
    }

    /// Scan in one direction using color comparison with stabilization.
    private func scanDirection(fromX: Int, fromY: Int, dx: Int, dy: Int,
                               refR: UInt8, refG: UInt8, refB: UInt8,
                               tolerance: UInt8, skipCount: Int = 0,
                               includeBorders: Bool = true) -> EdgeHit? {
        let isHorizontal = dx != 0
        let stabilizationNeeded = 3
        let stabilizationTolerance = 3

        var x = fromX + dx
        var y = fromY + dy

        // Mutable reference color — updated after each skip
        var curRefR = refR
        var curRefG = refG
        var curRefB = refB

        var edgesFound = 0
        var inEdgeTransition = false
        var stableCount = 0

        var candR: UInt8 = 0
        var candG: UInt8 = 0
        var candB: UInt8 = 0

        while x >= 0, x < width, y >= 0, y < height {
            let idx = (y * width + x) * 4
            let r = pixels[idx]
            let g = pixels[idx + 1]
            let b = pixels[idx + 2]

            let dR = abs(Int(r) - Int(curRefR))
            let dG = abs(Int(g) - Int(curRefG))
            let dB = abs(Int(b) - Int(curRefB))
            let exceeds = max(dR, max(dG, dB)) > Int(tolerance)

            if !inEdgeTransition {
                if exceeds {
                    if edgesFound < skipCount {
                        // Edge we need to skip — enter transition mode
                        inEdgeTransition = true
                        stableCount = 0
                    } else {
                        // Edge we want to return
                        var finalX = x
                        var finalY = y

                        // Peek: absorb 1-CSS-px border if enabled.
                        // On Retina (2x), CSS 1px = 2 device pixels, so peek `scale` pixels ahead.
                        if includeBorders {
                            let borderWidth = max(Int(scale.rounded()), 1)
                            let peekX = x + dx * borderWidth
                            let peekY = y + dy * borderWidth
                            if peekX >= 0, peekX < width, peekY >= 0, peekY < height {
                                let peekIdx = (peekY * width + peekX) * 4
                                let pR = pixels[peekIdx], pG = pixels[peekIdx + 1], pB = pixels[peekIdx + 2]
                                let bdr = max(abs(Int(pR) - Int(r)), abs(Int(pG) - Int(g)), abs(Int(pB) - Int(b)))
                                if bdr > Int(tolerance) {
                                    // Pixel past the border differs from edge pixel → border is 1 CSS px → absorb
                                    finalX = peekX
                                    finalY = peekY
                                }
                            }
                        }

                        let rawPixelDist = isHorizontal ? abs(finalX - fromX) : abs(finalY - fromY)
                        // For negative directions (left/up), the pixel grid boundary
                        // is 1 pixel closer to the cursor than the first-different pixel.
                        // At 2x this 0.5pt error was hidden by Int() truncation; at 1x it's visible.
                        let boundaryAdjust = (dx + dy < 0) ? 1 : 0
                        let distance = CGFloat(max(rawPixelDist - boundaryAdjust, 0)) / scale
                        let screenPos: CGFloat
                        if isHorizontal {
                            screenPos = screenFrame.origin.x + CGFloat(finalX) / scale
                        } else {
                            screenPos = screenFrame.origin.y + CGFloat(finalY) / scale
                        }
                        let absorbed = (finalX != x || finalY != y)
                        return EdgeHit(distance: distance, screenPosition: screenPos, borderAbsorbed: absorbed)
                    }
                }
            } else {
                // In edge transition: stabilize to find new region
                if stableCount == 0 {
                    // First pixel after entering transition — start candidate
                    candR = r
                    candG = g
                    candB = b
                    stableCount = 1
                } else {
                    let dCR = abs(Int(r) - Int(candR))
                    let dCG = abs(Int(g) - Int(candG))
                    let dCB = abs(Int(b) - Int(candB))
                    let candidateExceeds = max(dCR, max(dCG, dCB)) > stabilizationTolerance

                    if !candidateExceeds {
                        stableCount += 1
                        if stableCount >= stabilizationNeeded {
                            // Stable new region found
                            curRefR = candR
                            curRefG = candG
                            curRefB = candB
                            edgesFound += 1
                            inEdgeTransition = false
                            stableCount = 0
                        }
                    } else {
                        // Color changed again — restart candidate
                        candR = r
                        candG = g
                        candB = b
                        stableCount = 1
                    }
                }
            }

            x += dx
            y += dy
        }

        return nil
    }

    // MARK: - Snap (scan inward from rectangle edges)

    /// Scan inward from each side of a rectangle to find nearest object edges.
    /// `rect` is in AX/CG screen coords (same space as `screenFrame`).
    /// Returns snapped rect in AX/CG coords, or nil if edges not found on all 4 sides.
    package func scanInward(from rect: CGRect, samplesPerSide: Int = 7, tolerance: UInt8 = 1) -> CGRect? {
        let s = scale
        let sf = screenFrame

        // Convert rect to pixel coords
        let pLeft = min(max(Int((rect.minX - sf.origin.x) * s), 0), width - 1)
        let pRight = min(max(Int((rect.maxX - sf.origin.x) * s), 0), width - 1)
        let pTop = min(max(Int((rect.minY - sf.origin.y) * s), 0), height - 1)
        let pBottom = min(max(Int((rect.maxY - sf.origin.y) * s), 0), height - 1)

        guard pLeft < pRight, pTop < pBottom else { return nil }

        let sampleYs = evenlySpaced(from: pTop, to: pBottom, count: samplesPerSide)
        let sampleXs = evenlySpaced(from: pLeft, to: pRight, count: samplesPerSide)

        // Scan from left edge rightward
        var leftHits: [CGFloat] = []
        for sy in sampleYs {
            if let px = scanSimple(fromX: pLeft, fromY: sy, dx: 1, dy: 0,
                                   maxSteps: pRight - pLeft, tolerance: tolerance) {
                leftHits.append(sf.origin.x + CGFloat(px) / s)
            }
        }

        // Scan from right edge leftward
        // +1 because pixel x spans [x, x+1) — we want the far (right) edge
        var rightHits: [CGFloat] = []
        for sy in sampleYs {
            if let px = scanSimple(fromX: pRight, fromY: sy, dx: -1, dy: 0,
                                   maxSteps: pRight - pLeft, tolerance: tolerance) {
                rightHits.append(sf.origin.x + CGFloat(px + 1) / s)
            }
        }

        // Scan from top edge downward (CG: top = minY)
        var topHits: [CGFloat] = []
        for sx in sampleXs {
            if let py = scanSimple(fromX: sx, fromY: pTop, dx: 0, dy: 1,
                                   maxSteps: pBottom - pTop, tolerance: tolerance) {
                topHits.append(sf.origin.y + CGFloat(py) / s)
            }
        }

        // Scan from bottom edge upward (CG: bottom = maxY)
        // +1 because pixel y spans [y, y+1) — we want the far (bottom) edge
        var bottomHits: [CGFloat] = []
        for sx in sampleXs {
            if let py = scanSimple(fromX: sx, fromY: pBottom, dx: 0, dy: -1,
                                   maxSteps: pBottom - pTop, tolerance: tolerance) {
                bottomHits.append(sf.origin.y + CGFloat(py + 1) / s)
            }
        }

        // Require ≥2 successful scans per side
        guard leftHits.count >= 2, rightHits.count >= 2,
              topHits.count >= 2, bottomHits.count >= 2 else { return nil }

        // Use min/max (not median) to capture the full bounding box.
        // For curved objects (circles, icons, text) the outermost extent
        // is detected by the sample nearest the center of each side.
        let snappedLeft = leftHits.min()!
        let snappedRight = rightHits.max()!
        let snappedTop = topHits.min()!
        let snappedBottom = bottomHits.max()!

        guard snappedLeft < snappedRight, snappedTop < snappedBottom else { return nil }

        return CGRect(x: snappedLeft, y: snappedTop,
                      width: snappedRight - snappedLeft,
                      height: snappedBottom - snappedTop)
    }

    /// Walk from (fromX,fromY) in direction (dx,dy) for at most maxSteps.
    /// Returns the pixel coordinate (x or y) of the first color change, or nil.
    private func scanSimple(fromX: Int, fromY: Int, dx: Int, dy: Int,
                            maxSteps: Int, tolerance: UInt8) -> Int? {
        let refIdx = (fromY * width + fromX) * 4
        let refR = pixels[refIdx]
        let refG = pixels[refIdx + 1]
        let refB = pixels[refIdx + 2]

        var x = fromX + dx
        var y = fromY + dy
        var steps = 0

        while x >= 0, x < width, y >= 0, y < height, steps < maxSteps {
            let idx = (y * width + x) * 4
            let r = pixels[idx]
            let g = pixels[idx + 1]
            let b = pixels[idx + 2]

            let diff = max(abs(Int(r) - Int(refR)),
                           max(abs(Int(g) - Int(refG)), abs(Int(b) - Int(refB))))
            if diff > Int(tolerance) {
                return dx != 0 ? x : y
            }

            x += dx
            y += dy
            steps += 1
        }

        return nil
    }

    private func evenlySpaced(from start: Int, to end: Int, count: Int) -> [Int] {
        guard count > 1 else { return [(start + end) / 2] }
        // Inset slightly from edges to avoid sampling along the boundary itself
        let inset = max(1, (end - start) / (count * 2))
        let inStart = start + inset
        let inEnd = end - inset
        guard inStart < inEnd else { return [(start + end) / 2] }

        let step = CGFloat(inEnd - inStart) / CGFloat(count - 1)
        return (0..<count).map { i in
            inStart + Int(round(CGFloat(i) * step))
        }
    }

    private func median(_ values: [CGFloat]) -> CGFloat {
        let sorted = values.sorted()
        let count = sorted.count
        if count % 2 == 0 {
            return (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        } else {
            return sorted[count / 2]
        }
    }
}
