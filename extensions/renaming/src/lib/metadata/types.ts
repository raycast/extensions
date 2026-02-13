/**
 * Type definitions for file metadata
 */

export interface BasicFileMetadata {
  size: number;
  sizeFormatted: string;
  created: Date;
  modified: Date;
  isDirectory: boolean;
}

export interface ImageExifMetadata {
  width?: number;
  height?: number;
  dimensions?: string;
  cameraMake?: string;
  cameraModel?: string;
  camera?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTaken?: Date;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsLocation?: string;
  colorSpace?: string;
  orientation?: string;
}

export interface SpotlightMetadata {
  contentType?: string;
  kind?: string;
  duration?: number;
  durationFormatted?: string;
  pixelWidth?: number;
  pixelHeight?: number;
  audioChannels?: number;
  audioBitRate?: number;
  audioSampleRate?: number;
  videoBitRate?: number;
  frameRate?: number;
  codec?: string;
  artist?: string;
  album?: string;
  title?: string;
  composer?: string;
  genre?: string;
  year?: number;
  pageCount?: number;
  author?: string;
  creator?: string;
}

export interface FileMetadata {
  basic?: BasicFileMetadata;
  exif?: ImageExifMetadata;
  spotlight?: SpotlightMetadata;
}
