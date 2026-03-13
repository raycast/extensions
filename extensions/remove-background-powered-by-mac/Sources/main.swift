import CoreImage
import Foundation
import Vision

@available(macOS 14.0, *)
struct ImageBackgroundRemover {
    let request = VNGenerateForegroundInstanceMaskRequest()
    

    func processImage(at path: String) -> Result<CIImage, Error> {
        print(path)
        guard let image = CIImage(contentsOf: URL(fileURLWithPath: path)) else {
            return .failure(NSError(domain: "ImageError", code: 100, userInfo: [NSLocalizedDescriptionKey: "Invalid image path"]))
        }

        let handler = VNImageRequestHandler(ciImage: image, options: [:])


        do {
            try handler.perform([request])
            
            guard let result = request.results?.first else {
                return .failure(NSError(domain: "ImageError", code: 101, userInfo: [NSLocalizedDescriptionKey: "Failed to generate masked image"]))
            }
            let buf = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: false)
            let maskedImage = CIImage(cvImageBuffer: buf)
            return .success(maskedImage)
        } catch {
            return .failure(error)
        }
    }

    func saveImage(_ image: CIImage, originalImagePath: String) -> Bool {
        let url = URL(fileURLWithPath: originalImagePath)
        let directory = url.deletingLastPathComponent()
        let fileExtension = url.pathExtension
        let newFileName = url.deletingPathExtension().lastPathComponent + "-background-removed." + fileExtension
        let newURL = directory.appendingPathComponent(newFileName)

        let context = CIContext()
        do {
            try context.writePNGRepresentation(of: image, to: newURL, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            return true
        } catch {
            print("Failed to save image: \(error.localizedDescription)")
            return false
        }
    }
}

if #unavailable(macOS 14.0) {
    print("This extension requires macOS 14.0 or later.")
    exit(1)
}

if #available(macOS 14.0, *) {
    let remover = ImageBackgroundRemover()

    if CommandLine.argc < 2 {
        print("Usage: \(CommandLine.arguments[0]) <image_path>")
        exit(1)
    }

    for i in 1 ..< Int(CommandLine.argc) {
        let imagePath = CommandLine.arguments[Int(i)]
        switch remover.processImage(at: imagePath) {
        case let .success(maskedImage):
            if !remover.saveImage(maskedImage, originalImagePath: imagePath) {
                exit(2)
            }
        case let .failure(error):
            print("Error processing image \(imagePath): \(error.localizedDescription)")
            exit(3)
        }
    }
}
