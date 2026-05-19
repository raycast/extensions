import AVFoundation
import CoreImage
import CoreMedia
import Foundation
import ImageIO
import UniformTypeIdentifiers

// Disable stdout buffering so each base64 line is flushed immediately
setbuf(stdout, nil)

class FrameStreamer: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "camera.frame")
    private let context = CIContext()
    private let interval: TimeInterval
    private var lastCaptureTime: CFAbsoluteTime = 0
    private var observers: [NSObjectProtocol] = []

    init(interval: TimeInterval = 0.3) {
        self.interval = interval
        super.init()
    }

    func start() {
        session.sessionPreset = .low

        guard let device = AVCaptureDevice.default(for: .video) else {
            fputs("No camera found. Connect an external webcam or open your MacBook lid.\n", stderr)
            exit(1)
        }

        guard let input = try? AVCaptureDeviceInput(device: device) else {
            fputs("Cannot open camera input.\n", stderr)
            exit(1)
        }

        guard session.canAddInput(input) else {
            fputs("Cannot add camera input to capture session.\n", stderr)
            exit(1)
        }
        session.addInput(input)

        let output = AVCaptureVideoDataOutput()
        output.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        output.setSampleBufferDelegate(self, queue: queue)
        guard session.canAddOutput(output) else {
            fputs("Cannot add video output to capture session.\n", stderr)
            exit(1)
        }
        session.addOutput(output)
        observeSessionFailures()

        session.startRunning()
    }

    func stop() {
        observers.forEach(NotificationCenter.default.removeObserver)
        observers.removeAll()
        session.stopRunning()
    }

    private func observeSessionFailures() {
        let center = NotificationCenter.default

        observers.append(center.addObserver(
            forName: .AVCaptureSessionRuntimeError,
            object: session,
            queue: .main
        ) { notification in
            let error = notification.userInfo?[AVCaptureSessionErrorKey] as? NSError
            fputs("Camera runtime error: \(error?.localizedDescription ?? "unknown error")\n", stderr)
            exit(1)
        })

        observers.append(center.addObserver(
            forName: .AVCaptureSessionWasInterrupted,
            object: session,
            queue: .main
        ) { _ in
            fputs("Camera capture interrupted.\n", stderr)
            exit(1)
        })
    }

    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        // Throttle to the configured interval
        let now = CFAbsoluteTimeGetCurrent()
        guard now - lastCaptureTime >= interval else { return }
        lastCaptureTime = now

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }

        guard let jpegData = encodeJPEG(cgImage: cgImage, quality: 0.3) else { return }

        let base64 = jpegData.base64EncodedString()
        print(base64)
    }
}

func encodeJPEG(cgImage: CGImage, quality: CGFloat) -> Data? {
    let mutableData = CFDataCreateMutable(nil, 0)!
    guard let dest = CGImageDestinationCreateWithData(
        mutableData,
        UTType.jpeg.identifier as CFString,
        1,
        nil
    ) else { return nil }

    let options: [CFString: Any] = [
        kCGImageDestinationLossyCompressionQuality: quality
    ]
    CGImageDestinationAddImage(dest, cgImage, options as CFDictionary)

    guard CGImageDestinationFinalize(dest) else { return nil }
    return mutableData as Data
}

// --- Setup ---

let streamer = FrameStreamer(interval: 0.5)

// Handle SIGTERM through DispatchSourceSignal so cleanup runs outside the POSIX signal handler.
signal(SIGTERM, SIG_IGN)
let sigtermSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
sigtermSource.setEventHandler {
    streamer.stop()
    exit(0)
}
sigtermSource.resume()

// Monitor stdin for EOF (parent process died) — orphan protection
DispatchQueue.global(qos: .utility).async {
    while let _ = readLine() {
        // Discard any input; we only care about EOF
    }
    // stdin closed — parent is gone
    DispatchQueue.main.async {
        streamer.stop()
        exit(0)
    }
}

// Check camera permission before starting
let status = AVCaptureDevice.authorizationStatus(for: .video)
switch status {
case .authorized:
    break
case .notDetermined:
    let semaphore = DispatchSemaphore(value: 0)
    AVCaptureDevice.requestAccess(for: .video) { granted in
        if !granted {
            fputs("Camera access denied. Grant permission in System Settings > Privacy & Security > Camera.\n", stderr)
            exit(1)
        }
        semaphore.signal()
    }
    semaphore.wait()
case .denied, .restricted:
    fputs("Camera access denied. Grant permission in System Settings > Privacy & Security > Camera.\n", stderr)
    exit(1)
@unknown default:
    fputs("Unknown camera authorization status.\n", stderr)
    exit(1)
}

streamer.start()
dispatchMain()
