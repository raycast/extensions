import Foundation
import PDFKit
import UniformTypeIdentifiers
import AppKit
import CoreGraphics
import AVFoundation

enum CompressionError: LocalizedError {
        case unsupportedFormat
        case conversionFailed
        case compressionFailed
        case invalidInput
        case videoProcessingFailed
        
        var errorDescription: String? {
            switch self {
            case .unsupportedFormat:
                return "This file format is not supported"
            case .conversionFailed:
                return "Failed to convert the file"
            case .compressionFailed:
                return "Failed to compress the file"
            case .invalidInput:
                return "The input file is invalid or corrupted"
            case .videoProcessingFailed:
                return "Failed to process video file"
            }
        }
    }

class FileProcessor: ObservableObject {
    // MARK: - Published Properties
    @Published var isProcessing = false
    @Published var progress: Double = 0
    @Published var processingResult: ProcessingResult?
    
    // MARK: - Private Properties
    private let processingQueue = DispatchQueue(label: "com.achico.fileprocessing", qos: .userInitiated)
    private let cacheManager = CacheManager.shared
    private let videoProcessor = VideoProcessor()
    
    struct ProcessingResult {
        let originalSize: Int64
        let compressedSize: Int64
        let compressedURL: URL
        let fileName: String
        let originalFileName: String
        
        var savedPercentage: Int {
            guard originalSize > 0 else { return 0 }
            let percentage = Int(((Double(originalSize) - Double(compressedSize)) / Double(originalSize)) * 100)
            return max(0, percentage)
        }
        
        var suggestedFileName: String {
            // Remove UUID from filename if present
            let cleanFilename = originalFileName
                .replacingOccurrences(of: #"[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\."#,
                                    with: "",
                                    options: .regularExpression)
            let fileURL = URL(fileURLWithPath: cleanFilename)
            let filenameWithoutExt = fileURL.deletingPathExtension().lastPathComponent
            let fileExtension = compressedURL.pathExtension
            return "\(filenameWithoutExt)_compressed.\(fileExtension)"
        }
    }
    
    private func processAudio(from url: URL, to tempURL: URL, settings: CompressionSettings) async throws {
        let asset = AVURLAsset(url: url)
        let fileType = FileType(url: url)
        
        // Create a composition to work with the audio
        let composition = AVMutableComposition()
        
        // Try to get the audio track from the asset
        guard let audioTrack = try? await asset.loadTracks(withMediaType: .audio).first,
              let compositionTrack = composition.addMutableTrack(
                withMediaType: .audio,
                preferredTrackID: kCMPersistentTrackID_Invalid) else {
            throw CompressionError.compressionFailed
        }
        
        // Get asset duration using the new API
        let duration = try await asset.load(.duration)
        
        // Insert the audio track into the composition
        try compositionTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: duration),
            of: audioTrack,
            at: .zero
        )
        
        // Determine preset and output file type
        let (presetName, outputFileType): (String, AVFileType) = {
            switch fileType {
            case .mp3, .wav, .aiff, .m4a:
                return (AVAssetExportPresetAppleM4A, .m4a)
            default:
                return (AVAssetExportPresetAppleM4A, .m4a)
            }
        }()
        
        // Create export session with the composition
        guard let exportSession = AVAssetExportSession(
            asset: composition,
            presetName: presetName
        ) else {
            throw CompressionError.compressionFailed
        }
        
        // Create output URL with correct extension
        let outputURL = tempURL.deletingPathExtension().appendingPathExtension("m4a")
        
        // Remove any existing file at the output URL
        if FileManager.default.fileExists(atPath: outputURL.path) {
            try? FileManager.default.removeItem(at: outputURL)
        }
        
        // Ensure the output directory exists
        try FileManager.default.createDirectory(
            at: outputURL.deletingLastPathComponent(),
            withIntermediateDirectories: true,
            attributes: nil
        )
        
        // Configure export session
        exportSession.outputURL = outputURL
        exportSession.outputFileType = outputFileType
        
        // Monitor progress in a separate task
        let progressTask = Task {
            while !Task.isCancelled &&
                  (exportSession.status == .waiting || exportSession.status == .exporting) {
                await MainActor.run {
                    self.progress = Double(exportSession.progress)
                }
                try? await Task.sleep(nanoseconds: 100_000_000) // Sleep for 0.1 seconds
            }
        }
        
        // Start exporting and await completion
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            exportSession.exportAsynchronously {
                switch exportSession.status {
                case .completed:
                    // Verify the file exists after export
                    if FileManager.default.fileExists(atPath: outputURL.path) {
                        continuation.resume()
                    } else {
                        print("Export completed but file not found at: \(outputURL.path)")
                        continuation.resume(throwing: CompressionError.compressionFailed)
                    }
                case .failed:
                    if let error = exportSession.error {
                        print("Export Session Failed: \(error.localizedDescription)")
                        print("Error Details: \(String(describing: error))")
                        continuation.resume(throwing: error)
                    } else {
                        print("Export Session Failed without error details")
                        continuation.resume(throwing: CompressionError.compressionFailed)
                    }
                case .cancelled:
                    print("Export Session Cancelled")
                    continuation.resume(throwing: CompressionError.compressionFailed)
                default:
                    print("Export Session ended with status: \(exportSession.status.rawValue)")
                    continuation.resume(throwing: CompressionError.compressionFailed)
                }
            }
        }
        
        // Cancel the progress monitoring task
        progressTask.cancel()
        
        // Verify the file exists one final time
        guard FileManager.default.fileExists(atPath: outputURL.path) else {
            throw CompressionError.compressionFailed
        }
        
        // Make sure we're returning the correct path
        if outputURL != tempURL {
            try? FileManager.default.removeItem(at: tempURL)
            try FileManager.default.moveItem(at: outputURL, to: tempURL)
        }
        
        await MainActor.run {
            self.progress = 1.0
        }
    }
    
    // MARK: - Lifecycle
    deinit {
        cleanup()
    }
    
    // MARK: - Public Methods
    @MainActor
    func processFile(url: URL, settings: CompressionSettings? = nil, originalFileName: String? = nil) async throws {
        
        isProcessing = true
        progress = 0
        processingResult = nil
        
        do {
            let result = try await processInBackground(
                url: url,
                settings: settings,
                originalFileName: originalFileName ?? url.lastPathComponent
            )
            
            self.processingResult = result
        } catch {
            isProcessing = false
            throw error
        }
        
        isProcessing = false
        progress = 1.0
    }
    
    func cleanup() {
        processingResult = nil
        cacheManager.cleanupOldFiles()
    }
    
    // MARK: - Private Methods - Main Processing
    private func processInBackground(url: URL, settings: CompressionSettings? = nil, originalFileName: String) async throws -> ProcessingResult {
        let originalSize = try FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64 ?? 0
        let originalExtension = url.pathExtension
        let tempURL = try cacheManager.createTemporaryURL(for: originalFileName)
        
        
        
        let compressionSettings = settings ?? CompressionSettings()
        
        let fileType = FileType(url: url)
            if fileType.isVideo {
                try await processVideo(from: url, to: tempURL, settings: compressionSettings)
            } else if fileType.isAudio {
                try await processAudio(from: url, to: tempURL, settings: compressionSettings)
        } else {
            switch url.pathExtension.lowercased() {
            case "pdf":
                try processPDF(from: url, to: tempURL)
            case "jpg", "jpeg":
                try processJPEG(from: url, to: tempURL, settings: compressionSettings)
            case "png":
                try processPNG(from: url, to: tempURL, settings: compressionSettings)
            case "heic":
                try processHEIC(from: url, to: tempURL, settings: compressionSettings)
            case "tiff", "tif":
                try processTIFF(from: url, to: tempURL, settings: compressionSettings)
            case "gif":
                try processGIF(from: url, to: tempURL)
            case "bmp":
                try processBMP(from: url, to: tempURL, settings: compressionSettings)
            case "webp":
                try processWebP(from: url, to: tempURL, settings: compressionSettings)
            case "svg":
                try processSVG(from: url, to: tempURL, settings: compressionSettings)
            case "raw", "cr2", "nef", "arw":
                try processRAW(from: url, to: tempURL, settings: compressionSettings)
            case "ico":
                try processICO(from: url, to: tempURL, settings: compressionSettings)
            default:
                throw CompressionError.unsupportedFormat
            }
        }
        
        let compressedSize = try FileManager.default.attributesOfItem(atPath: tempURL.path)[.size] as? Int64 ?? 0
        print("Debug - Creating ProcessingResult:")
            print("Debug - Temp URL last component: \(tempURL.lastPathComponent)")
            print("Debug - Original filename being used: \(originalFileName)")
            return ProcessingResult(
                originalSize: originalSize,
                compressedSize: compressedSize,
                compressedURL: tempURL,
                fileName: tempURL.lastPathComponent,
                originalFileName: originalFileName
            )
    }
    
    private func processVideo(from url: URL, to tempURL: URL, settings: CompressionSettings) async throws {
        let videoSettings = VideoProcessor.VideoCompressionSettings(
            quality: Float(settings.quality),
            maxWidth: settings.maxDimension != nil ? Int(settings.maxDimension!) : nil,
            bitrateMultiplier: 0.7,
            frameRate: 30,
            audioEnabled: true
        )
        
        do {
            try await videoProcessor.compressVideo(
                inputURL: url,
                outputURL: tempURL,
                settings: videoSettings
            ) { [weak self] progress in
                Task { @MainActor in
                    self?.progress = Double(progress)
                }
            }
        } catch {
            throw CompressionError.videoProcessingFailed
        }
    }
    
    private func processICO(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let image = NSImage(contentsOf: url) else {
            throw CompressionError.conversionFailed
        }
        
        guard let compressedData = compressImage(image, format: .png, settings: settings) else {
            throw CompressionError.compressionFailed
        }
        
        let pngURL = tempURL.deletingPathExtension().appendingPathExtension("png")
        try compressedData.write(to: pngURL)
    }
    
    private func processSVG(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let data = try? Data(contentsOf: url),
              let svgString = String(data: data, encoding: .utf8) else {
            throw CompressionError.conversionFailed
        }
        
        let cleanedSVG = svgString
            .replacingOccurrences(of: "<!--[\\s\\S]*?-->", with: "", options: .regularExpression)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "> <", with: "><")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        
        try cleanedSVG.data(using: .utf8)?.write(to: tempURL)
    }
    
    
    private func processRAW(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil) else {
            throw CompressionError.conversionFailed
        }
        
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: settings.maxDimension ?? 2048
        ]
        
        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, options as CFDictionary) else {
            throw CompressionError.conversionFailed
        }
        
        let image = NSImage(cgImage: cgImage, size: NSSize(width: cgImage.width, height: cgImage.height))
        guard let compressedData = compressImage(image, format: .jpeg, settings: settings) else {
            throw CompressionError.compressionFailed
        }
        
        let jpegURL = tempURL.deletingPathExtension().appendingPathExtension("jpg")
        try compressedData.write(to: jpegURL)
    }
    
    
    // MARK: - Private Methods - Format-Specific Processing
    private func processPDF(from url: URL, to tempURL: URL) throws {
        guard let document = PDFDocument(url: url) else {
            throw CompressionError.conversionFailed
        }
        
        let newDocument = PDFDocument()
        let totalPages = document.pageCount
        
        for i in 0..<totalPages {
            autoreleasepool {
                if let page = document.page(at: i) {
                    if let compressedPage = try? compressPDFPage(page) {
                        newDocument.insert(compressedPage, at: i)
                    } else {
                        newDocument.insert(page, at: i)
                    }
                }
            }
            
            DispatchQueue.main.async {
                self.progress = Double(i + 1) / Double(totalPages)
            }
        }
        
        newDocument.write(to: tempURL)
    }
    
    private func processJPEG(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let image = NSImage(contentsOf: url) else {
            throw CompressionError.conversionFailed
        }
        
        guard let compressedData = compressImage(image, format: .jpeg, settings: settings) else {
            throw CompressionError.compressionFailed
        }
        
        try compressedData.write(to: tempURL)
    }
    
    private func processPNG(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let image = NSImage(contentsOf: url) else {
            throw CompressionError.conversionFailed
        }
        
        guard let compressedData = compressImage(image, format: .png, settings: settings) else {
            throw CompressionError.compressionFailed
        }
        
        try compressedData.write(to: tempURL)
    }
    
    private func processHEIC(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let image = NSImage(contentsOf: url) else {
            throw CompressionError.conversionFailed
        }
        
        guard let compressedData = compressImage(image, format: .jpeg, settings: settings) else {
            throw CompressionError.compressionFailed
        }
        
        let jpegURL = tempURL.deletingPathExtension().appendingPathExtension("jpg")
        try compressedData.write(to: jpegURL)
    }
    
    private func processTIFF(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let image = NSImage(contentsOf: url) else {
            throw CompressionError.conversionFailed
        }
        
        guard let compressedData = compressImage(image, format: .jpeg, settings: settings) else {
            throw CompressionError.compressionFailed
        }
        
        try compressedData.write(to: tempURL)
    }
    
    private func processGIF(from url: URL, to tempURL: URL) throws {
        guard let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil) else {
            throw CompressionError.conversionFailed
        }
        
        let frameCount = CGImageSourceGetCount(imageSource)
        
        if frameCount > 1 {
            try compressAnimatedGIF(imageSource, frameCount: frameCount, to: tempURL)
        } else {
            guard let image = NSImage(contentsOf: url) else {
                throw CompressionError.conversionFailed
            }
            
            let settings = CompressionSettings(
                pngCompressionLevel: 6,
                preserveMetadata: true,
                maxDimension: 2048,
                optimizeForWeb: true
            )
            
            guard let compressedData = compressImage(image, format: .png, settings: settings) else {
                throw CompressionError.compressionFailed
            }
            
            let pngURL = tempURL.deletingPathExtension().appendingPathExtension("png")
            try compressedData.write(to: pngURL)
        }
    }
    
    private func processBMP(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let image = NSImage(contentsOf: url) else {
            throw CompressionError.conversionFailed
        }
        
        guard let compressedData = compressImage(image, format: .png, settings: settings) else {
            throw CompressionError.compressionFailed
        }
        
        let pngURL = tempURL.deletingPathExtension().appendingPathExtension("png")
        try compressedData.write(to: pngURL)
    }
    
    private func processWebP(from url: URL, to tempURL: URL, settings: CompressionSettings) throws {
        guard let image = NSImage(contentsOf: url) else {
            throw CompressionError.conversionFailed
        }
        
        let hasAlpha = imageHasAlpha(image)
        let format: NSBitmapImageRep.FileType = hasAlpha ? .png : .jpeg
        
        guard let compressedData = compressImage(image, format: format, settings: settings) else {
            throw CompressionError.compressionFailed
        }
        
        let newExt = hasAlpha ? "png" : "jpg"
        let newURL = tempURL.deletingPathExtension().appendingPathExtension(newExt)
        try compressedData.write(to: newURL)
    }
    
    // MARK: - Private Methods - Helper Functions
    private func compressPDFPage(_ page: PDFPage) throws -> PDFPage? {
        let pageRect = page.bounds(for: .mediaBox)
        
        let image = NSImage(size: pageRect.size)
        image.lockFocus()
        if let context = NSGraphicsContext.current?.cgContext {
            page.draw(with: .mediaBox, to: context)
        }
        image.unlockFocus()
        
        guard let tiffData = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData),
              let compressedData = bitmap.representation(
                using: .jpeg,
                properties: [.compressionFactor: 0.5]
              ),
              let compressedImage = NSImage(data: compressedData) else {
            return nil
        }
        
        return PDFPage(image: compressedImage)
    }
    
    private func compressImage(_ image: NSImage, format: NSBitmapImageRep.FileType, settings: CompressionSettings) -> Data? {
        
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            
            return nil
        }
        
        let processedCGImage: CGImage
        if let maxDimension = settings.maxDimension {
            
            if let resized = resizeImage(cgImage, maxDimension: maxDimension) {
                processedCGImage = resized
                
            } else {
                
                processedCGImage = cgImage
            }
        } else {
            
            processedCGImage = cgImage
        }
        
        let bitmapRep = NSBitmapImageRep(cgImage: processedCGImage)
        
        
        var compressionProperties: [NSBitmapImageRep.PropertyKey: Any] = [:]
        
        switch format {
        case .jpeg:
            compressionProperties[.compressionFactor] = settings.quality
        case .png:
            compressionProperties[.compressionFactor] = 1.0
        default:
            break
        }
        
        return bitmapRep.representation(using: format, properties: compressionProperties)
    }
    
    private func imageHasAlpha(_ image: NSImage) -> Bool {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            return false
        }
        
        let alphaInfo = cgImage.alphaInfo
        return alphaInfo != .none && alphaInfo != .noneSkipLast && alphaInfo != .noneSkipFirst
    }
    
    private func resizeImage(_ cgImage: CGImage, maxDimension: CGFloat) -> CGImage? {
        let currentWidth = CGFloat(cgImage.width)
        let currentHeight = CGFloat(cgImage.height)
        
        // Calculate scale factor to maintain aspect ratio
        let scaleFactor = min(maxDimension / currentWidth, maxDimension / currentHeight)
        
        // Only resize if the image is larger than maxDimension
        if scaleFactor >= 1.0 {
            return cgImage
        }
        
        let newWidth = Int(currentWidth * scaleFactor)
        let newHeight = Int(currentHeight * scaleFactor)
        
        // Create a bitmap context with the proper color space and bitmap info
        let bitmapInfo: UInt32
        if cgImage.alphaInfo == .none {
            bitmapInfo = CGImageAlphaInfo.noneSkipLast.rawValue
        } else {
            bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
        }
        
        guard let context = CGContext(
            data: nil,
            width: newWidth,
            height: newHeight,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpace(name: CGColorSpace.sRGB)!,
            bitmapInfo: bitmapInfo
        ) else {
            print("Debug - Failed to create context")
            return nil
        }
        
        // Set high quality image interpolation
        context.interpolationQuality = .high
        
        // Draw the image in the new size
        let newRect = CGRect(x: 0, y: 0, width: newWidth, height: newHeight)
        context.draw(cgImage, in: newRect)
        
        // Get the resized image
        guard let resizedImage = context.makeImage() else {
            
            return nil
        }
        
        
        return resizedImage
    }
    
    private func compressAnimatedGIF(_ imageSource: CGImageSource, frameCount: Int, to url: URL) throws {
        guard let destination = CGImageDestinationCreateWithURL(
            url as CFURL,
            UTType.gif.identifier as CFString,
            frameCount,
            nil
        ) else {
            throw CompressionError.compressionFailed
        }
        
        if let properties = CGImageSourceCopyProperties(imageSource, nil) {
            CGImageDestinationSetProperties(destination, properties)
        }
        
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 1024
        ]
        
        for i in 0..<frameCount {
            autoreleasepool {
                guard let frameProperties = CGImageSourceCopyPropertiesAtIndex(imageSource, i, nil) else {
                    return
                }
                
                // Extract GIF-specific properties
                let gifProperties = (frameProperties as Dictionary)[kCGImagePropertyGIFDictionary] as? Dictionary<CFString, Any>
                
                // Get delay time for the frame
                let defaultDelay = 0.1
                let delayTime: Double
                if let delay = gifProperties?[kCGImagePropertyGIFDelayTime] as? Double {
                    delayTime = delay
                } else {
                    delayTime = defaultDelay
                }
                
                // Create optimized frame
                guard let frameImage = CGImageSourceCreateImageAtIndex(imageSource, i, options as CFDictionary) else {
                    return
                }
                
                // Prepare frame properties for destination
                let destFrameProperties: [CFString: Any] = [
                    kCGImagePropertyGIFDictionary: [
                        kCGImagePropertyGIFDelayTime: delayTime
                    ]
                ]
                
                CGImageDestinationAddImage(destination, frameImage, destFrameProperties as CFDictionary)
            }
            
            DispatchQueue.main.async {
                self.progress = Double(i + 1) / Double(frameCount)
            }
        }
        
        if !CGImageDestinationFinalize(destination) {
            throw CompressionError.compressionFailed
        }
    }
    
    // MARK: - Metadata Handling
    private func extractMetadata(from imageSource: CGImageSource) -> [CFString: Any]? {
        guard let properties = CGImageSourceCopyProperties(imageSource, nil) as? [CFString: Any] else {
            return nil
        }
        
        var metadata: [CFString: Any] = [:]
        
        // Extract relevant metadata while excluding unnecessary data
        let keysToPreserve: [CFString] = [
            kCGImagePropertyOrientation,
            kCGImagePropertyDPIHeight,
            kCGImagePropertyDPIWidth,
            kCGImagePropertyPixelHeight,
            kCGImagePropertyPixelWidth,
            kCGImagePropertyProfileName
        ]
        
        for key in keysToPreserve {
            if let value = properties[key] {
                metadata[key] = value
            }
        }
        
        return metadata
    }
    
    // MARK: - Quality and Optimization
    private func determineOptimalSettings(for image: NSImage, format: NSBitmapImageRep.FileType) -> CompressionSettings {
        let size = image.size
        let totalPixels = size.width * size.height
        
        // Base settings
        var settings = CompressionSettings()
        
        // Adjust quality based on image size
        if totalPixels > 4_000_000 { // 2000x2000 pixels
            settings.maxDimension = 2048
            settings.quality = 0.7
        } else if totalPixels > 1_000_000 { // 1000x1000 pixels
            settings.maxDimension = 1500
            settings.quality = 0.8
        } else {
            settings.maxDimension = nil
            settings.quality = 0.9
        }
        
        // Format-specific adjustments
        switch format {
        case .jpeg:
            // JPEG-specific optimizations
            if totalPixels > 8_000_000 {
                settings.quality = 0.6
            }
            settings.preserveMetadata = true
            
        case .png:
            // PNG-specific optimizations
            if imageHasAlpha(image) {
                settings.pngCompressionLevel = 7
            } else {
                settings.pngCompressionLevel = 9
            }
            settings.preserveMetadata = true
            
        default:
            settings.preserveMetadata = false
        }
        
        return settings
    }
    
    // MARK: - Progress Tracking
    private func updateProgress(_ progress: Double) {
        DispatchQueue.main.async {
            self.progress = min(max(progress, 0), 1)
        }
    }
}
    
    // MARK: - Extensions
    extension FileProcessor {
        enum FileType {
            case pdf
            case jpeg
            case png
            case heic
            case gif
            case tiff
            case bmp
            case webp
            case svg
            case raw
            case ico
            case mp4
            case mov
            case avi
            case mpeg2
            case quickTime
            case mp3
            case wav
            case m4a
            case aiff
            case unknown
            
            init(url: URL) {
                switch url.pathExtension.lowercased() {
                case "pdf": self = .pdf
                case "jpg", "jpeg": self = .jpeg
                case "png": self = .png
                case "heic": self = .heic
                case "gif": self = .gif
                case "tiff", "tif": self = .tiff
                case "bmp": self = .bmp
                case "webp": self = .webp
                case "svg": self = .svg
                case "raw", "cr2", "nef", "arw": self = .raw
                case "ico": self = .ico
                case "mp4": self = .mp4
                case "mov": self = .mov
                case "avi": self = .avi
                case "mpg", "mpeg": self = .mpeg2
                case "qt": self = .quickTime
                case "mp3": self = .mp3
                case "wav": self = .wav
                case "m4a": self = .m4a
                case "aiff", "aif": self = .aiff
                default: self = .unknown
                }
            }
            
            var isAudio: Bool {
                        switch self {
                        case .mp3, .wav, .m4a, .aiff:
                            return true
                        default:
                            return false
                        }
                    }
            
            var isVideo: Bool {
                switch self {
                case .mp4, .mov, .avi, .mpeg2, .quickTime:
                    return true
                default:
                    return false
                }
            }
            
            var defaultOutputExtension: String {
                switch self {
                case .pdf: return "pdf"
                case .jpeg: return "jpg"
                case .png: return "png"
                case .heic: return "jpg"
                case .gif: return "gif"
                case .tiff: return "jpg"
                case .bmp: return "png"
                case .webp: return "jpg"
                case .svg: return "svg"
                case .raw: return "jpg"
                case .ico: return "png"
                case .mp4, .mov, .avi, .mpeg2, .quickTime: return "mp4"
                case .mp3: return "mp3"
                case .wav: return "wav"
                case .m4a: return "m4a"
                case .aiff: return "aiff"
                case .unknown: return ""
                }
            }
        }
    }
