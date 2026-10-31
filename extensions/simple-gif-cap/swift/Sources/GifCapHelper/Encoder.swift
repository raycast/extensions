import AVFoundation
import ImageIO
import RaycastSwiftMacros
import UniformTypeIdentifiers

// Built-in GIF encoder on system frameworks only (AVFoundation to read frames,
// ImageIO to write the GIF), so the extension works without ffmpeg.

struct MediaInfo: Codable {
  let duration: Double
  let width: Int
  let height: Int
}

struct EncodeRequest: Codable {
  let input: String
  let output: String
  let fps: Double
  /// 0 keeps the recorded width.
  let maxWidth: Int
  let start: Double
  /// Seconds from the start of the video; nil plays to the end.
  let end: Double?
}

enum EncodeError: Error {
  case noFrames
  case cannotCreate(String)
  case cannotFinalize
}

/// Duration and pixel size of a video or GIF.
@raycast func probeMedia(path: String) async throws -> MediaInfo {
  let url = URL(fileURLWithPath: path)
  if url.pathExtension.lowercased() == "gif" {
    return gifInfo(url)
  }

  let asset = AVURLAsset(url: url)
  let duration = try await asset.load(.duration).seconds
  guard let track = try await asset.loadTracks(withMediaType: .video).first else {
    return MediaInfo(duration: duration, width: 0, height: 0)
  }

  let (size, transform) = try await track.load(.naturalSize, .preferredTransform)
  let rect = CGRect(origin: .zero, size: size).applying(transform)

  return MediaInfo(duration: duration, width: Int(abs(rect.width)), height: Int(abs(rect.height)))
}

private func gifInfo(_ url: URL) -> MediaInfo {
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
    return MediaInfo(duration: 0, width: 0, height: 0)
  }

  let count = CGImageSourceGetCount(source)
  var duration = 0.0
  for index in 0..<count {
    let props = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any]
    let gif = props?[kCGImagePropertyGIFDictionary] as? [CFString: Any]
    duration += gif?[kCGImagePropertyGIFDelayTime] as? Double ?? 0
  }

  let first = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]

  return MediaInfo(
    duration: duration,
    width: first?[kCGImagePropertyPixelWidth] as? Int ?? 0,
    height: first?[kCGImagePropertyPixelHeight] as? Int ?? 0)
}

/// Encodes the [start, end) part of a video to a looping GIF.
@raycast func encodeGif(request: EncodeRequest) async throws -> MediaInfo {
  let asset = AVURLAsset(url: URL(fileURLWithPath: request.input))
  let total = try await asset.load(.duration).seconds
  let end = min(request.end ?? total, total)
  let frameCount = Int(((end - request.start) * request.fps).rounded(.down))
  guard frameCount > 0 else { throw EncodeError.noFrames }

  let generator = AVAssetImageGenerator(asset: asset)
  generator.appliesPreferredTrackTransform = true
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = CMTime(seconds: 0.5 / request.fps, preferredTimescale: 600)
  if request.maxWidth > 0 {
    generator.maximumSize = CGSize(width: request.maxWidth, height: 100_000)
  }

  let url = URL(fileURLWithPath: request.output)
  guard
    let destination = CGImageDestinationCreateWithURL(
      url as CFURL, UTType.gif.identifier as CFString, frameCount, nil)
  else { throw EncodeError.cannotCreate(request.output) }

  let loop = [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]]
  CGImageDestinationSetProperties(destination, loop as CFDictionary)
  let delay = 1 / request.fps
  let frameProperties = [
    kCGImagePropertyGIFDictionary: [
      kCGImagePropertyGIFDelayTime: delay, kCGImagePropertyGIFUnclampedDelayTime: delay,
    ]
  ]

  var width = 0
  var height = 0
  for index in 0..<frameCount {
    let time = CMTime(seconds: request.start + Double(index) * delay, preferredTimescale: 600)
    let image = try await generator.image(at: time).image
    width = image.width
    height = image.height
    CGImageDestinationAddImage(destination, image, frameProperties as CFDictionary)
  }

  guard CGImageDestinationFinalize(destination) else { throw EncodeError.cannotFinalize }

  return MediaInfo(duration: Double(frameCount) * delay, width: width, height: height)
}
