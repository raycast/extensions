import Foundation
import AVFoundation
import RaycastSwiftMacros
import ShazamKit

// Renamed @raycast function
@raycast func shazam() async throws -> ShazamMedia? {

  if #available(macOS 14.0, *) {
    let session = SHManagedSession()
    let result = await session.result()

    switch result {
      case .match(let match ):
        print("Matched \(match.mediaItems.count) items")
        let matchedMediaItem = match.mediaItems.first

        return ShazamMedia(
            title: (matchedMediaItem?.title!)!,
            subtitle: (matchedMediaItem?.subtitle!)!,
            artist: (matchedMediaItem?.artist!)!,
            genres: (matchedMediaItem?.genres)!,
            creationDate: (matchedMediaItem?.creationDate!)!,
            appleMusicURL: (matchedMediaItem?.appleMusicURL!)!,
            artWorkURL: (matchedMediaItem?.artworkURL!)!
        )
      case .error(let error, let signature):
        throw error
      case .noMatch:
        return nil

    }
  } else {
    // Fallback on earlier versions
    return nil
  }
  return nil
}

struct ShazamMedia : Encodable {
    var title: String
    var subtitle: String
    var artist: String
    var genres: [String]
    var creationDate: Date
    var appleMusicURL: URL
    var artWorkURL: URL
}
