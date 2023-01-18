interface ListResponse {
  mediaItems: MediaItem[];
  nextPageToken: string;
}

interface MediaItem {
  id: string;
  description: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata: MediaMetadata;
  contributorInfo: ContributorInfo;
  filename: string;
}

interface MediaMetadata {
  creationTime: string;
  width: number;
  height: number;

  photo?: Photo;
  video?: Video;
}

interface ContributorInfo {
  profilePictureBaseUrl: string;
  displayName: string;
}

interface Photo {
  cameraMake: string;
  cameraModel: string;
  focalLength: number;
  apertureFNumber: number;
  isoEquivalent: number;
  exposureTime: string;
}

interface Video {
  cameraMake: string;
  cameraModel: string;
  fps: number;
  status: VideoProcessingStatus;
}

enum VideoProcessingStatus {
  " PROCESSING" = "PROCESSING",
  " READY" = "READY",
  " FAILED" = "FAILED",
}

interface Error {
  type: string;
  message: string;
}

export { VideoProcessingStatus };
export type { ListResponse, MediaItem, MediaMetadata, ContributorInfo, Photo, Video, Error };
