import AVFoundation
import Foundation
import Vision

/// Receives camera frames on its own queue and reports barcode payloads.
final class FrameReader: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate, @unchecked Sendable {
  let queue = DispatchQueue(label: "barcode-scanner.frames")
  private let symbologies: [VNBarcodeSymbology]
  private let onCode: @Sendable (String) -> Void
  private var lastFrame = Date.distantPast
  private let lock = NSLock()
  private var region = CGRect(x: 0, y: 0, width: 1, height: 1)

  /// Normalized, bottom-left origin, in image space. Safe to set from any thread.
  func setRegion(_ rect: CGRect) {
    lock.lock()
    region = rect
    lock.unlock()
  }

  init(symbologies: [VNBarcodeSymbology], onCode: @escaping @Sendable (String) -> Void) {
    self.symbologies = symbologies
    self.onCode = onCode
  }

  func captureOutput(
    _ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    let now = Date()
    guard now.timeIntervalSince(lastFrame) >= 0.08 else { return }
    lastFrame = now
    guard let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

    let request = VNDetectBarcodesRequest()
    let supported = Set(VNDetectBarcodesRequest.supportedSymbologies)
    request.symbologies = symbologies.filter { supported.contains($0) }
    guard !request.symbologies.isEmpty else { return }

    lock.lock()
    request.regionOfInterest = region
    lock.unlock()

    let handler = VNImageRequestHandler(cvPixelBuffer: buffer, options: [:])
    guard (try? handler.perform([request])) != nil else { return }
    for observation in request.results ?? [] {
      if let payload = observation.payloadStringValue, !payload.isEmpty {
        onCode(payload)
        return
      }
    }
  }
}
