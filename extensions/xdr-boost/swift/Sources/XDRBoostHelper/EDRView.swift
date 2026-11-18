import Cocoa
import MetalKit

// Ported from Headroom (MIT, © 2026 fichl), Sources/Gamma.swift at 6e7c20a. Details in NOTICE.md.

/// Metal view showing one EDR color from a 1×1 drawable. Used as the trigger pixel that keeps
/// the panel in EDR mode, so table values above SDR white are displayable.
final class EDRView: MTKView, MTKViewDelegate {
    private let queue: MTLCommandQueue

    init?(value: Double) {
        guard let device = MTLCreateSystemDefaultDevice(), let q = device.makeCommandQueue() else { return nil }
        queue = q
        super.init(frame: NSRect(x: 0, y: 0, width: 1, height: 1), device: device)
        colorPixelFormat = .rgba16Float
        colorspace = CGColorSpace(name: CGColorSpace.extendedLinearDisplayP3)
        autoResizeDrawable = false
        drawableSize = CGSize(width: 1, height: 1)
        (layer as? CAMetalLayer)?.wantsExtendedDynamicRangeContent = true
        layer?.isOpaque = false
        clearColor = MTLClearColor(red: value, green: value, blue: value, alpha: 1)
        // EDR content that stops updating eventually stops counting: redraw at 5 fps.
        preferredFramesPerSecond = 5
        delegate = self
    }

    required init(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

    func draw(in view: MTKView) {
        guard let pass = currentRenderPassDescriptor, let drawable = currentDrawable,
              let buffer = queue.makeCommandBuffer(),
              let encoder = buffer.makeRenderCommandEncoder(descriptor: pass) else { return }
        encoder.endEncoding()
        buffer.present(drawable)
        buffer.commit()
    }
}
