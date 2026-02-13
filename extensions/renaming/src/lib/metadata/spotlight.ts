/**
 * macOS Spotlight metadata via mdls command
 *
 * Two-layer design:
 * - getRawSpotlightAttributes() returns ALL kMDItem attributes from mdls as a raw Map
 * - getSpotlightMetadata() maps a curated subset into the typed SpotlightMetadata interface
 *
 * To access a new kMDItem key, add it to getSpotlightMetadata() — no changes needed in the extraction layer.
 */

import { exec } from "child_process";
import { promisify } from "util";
import type { SpotlightMetadata } from "./types";
import { log } from "../logger";

const execAsync = promisify(exec);

/**
 * Format duration in seconds to human readable string
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parse mdls output into key-value pairs
 */
function parseMdlsOutput(output: string): Map<string, string> {
  const result = new Map<string, string>();

  for (const line of output.split("\n")) {
    const match = line.match(/^(\w+)\s+=\s+(.+)$/);
    if (match) {
      const [, key, value] = match!;
      // Remove quotes and handle (null) values
      if (key && value && value !== "(null)") {
        result.set(key, value.replace(/^"(.+)"$/, "$1"));
      }
    }
  }

  return result;
}

/**
 * Get all Spotlight metadata attributes for a file as raw key-value pairs.
 * Returns the full mdls output — consumers pick the keys they need.
 */
export async function getRawSpotlightAttributes(filePath: string): Promise<Map<string, string> | null> {
  try {
    const escapedPath = filePath.replace(/'/g, "'\\''");
    const { stdout } = await execAsync(`mdls '${escapedPath}'`, { timeout: 5000 });
    const attrs = parseMdlsOutput(stdout);
    return attrs.size > 0 ? attrs : null;
  } catch (error) {
    log.metadata.warn(`Failed to read Spotlight metadata from "${filePath}"`, error);
    return null;
  }
}

/**
 * Get typed Spotlight metadata using mdls command.
 * Maps a curated subset of kMDItem attributes into the SpotlightMetadata interface.
 */
export async function getSpotlightMetadata(filePath: string): Promise<SpotlightMetadata | null> {
  const attrs = await getRawSpotlightAttributes(filePath);
  if (!attrs) return null;

  const metadata: SpotlightMetadata = {};

  // Content type and kind
  const contentType = attrs.get("kMDItemContentType");
  if (contentType) metadata.contentType = contentType;

  const kind = attrs.get("kMDItemKind");
  if (kind) metadata.kind = kind;

  // Duration (audio/video)
  const duration = attrs.get("kMDItemDurationSeconds");
  if (duration) {
    metadata.duration = parseFloat(duration);
    metadata.durationFormatted = formatDuration(metadata.duration);
  }

  // Image/video dimensions
  const pixelWidth = attrs.get("kMDItemPixelWidth");
  const pixelHeight = attrs.get("kMDItemPixelHeight");
  if (pixelWidth) metadata.pixelWidth = parseInt(pixelWidth, 10);
  if (pixelHeight) metadata.pixelHeight = parseInt(pixelHeight, 10);

  // Audio properties
  const audioChannels = attrs.get("kMDItemAudioChannelCount");
  if (audioChannels) metadata.audioChannels = parseInt(audioChannels, 10);

  const audioBitRate = attrs.get("kMDItemAudioBitRate");
  if (audioBitRate) metadata.audioBitRate = parseInt(audioBitRate, 10);

  const audioSampleRate = attrs.get("kMDItemAudioSampleRate");
  if (audioSampleRate) metadata.audioSampleRate = parseInt(audioSampleRate, 10);

  // Video properties
  const videoBitRate = attrs.get("kMDItemTotalBitRate");
  if (videoBitRate) metadata.videoBitRate = parseInt(videoBitRate, 10);

  const frameRate = attrs.get("kMDItemVideoFrameRate");
  if (frameRate) metadata.frameRate = parseFloat(frameRate);

  // Codec
  const codecs = attrs.get("kMDItemCodecs");
  if (codecs) {
    // Format: ("codec1", "codec2") -> clean it up
    metadata.codec = codecs.replace(/[()"\s]/g, "").replace(/,/g, ", ");
  }

  // Audio metadata (music files)
  const artist = attrs.get("kMDItemAuthors");
  if (artist) metadata.artist = artist.replace(/[()"\s]/g, "");

  const album = attrs.get("kMDItemAlbum");
  if (album) metadata.album = album;

  const title = attrs.get("kMDItemTitle");
  if (title) metadata.title = title;

  const composer = attrs.get("kMDItemComposer");
  if (composer) metadata.composer = composer;

  const genre = attrs.get("kMDItemMusicalGenre");
  if (genre) metadata.genre = genre;

  const year = attrs.get("kMDItemRecordingYear");
  if (year) metadata.year = parseInt(year, 10);

  // Document metadata
  const pageCount = attrs.get("kMDItemNumberOfPages");
  if (pageCount) metadata.pageCount = parseInt(pageCount, 10);

  const author = attrs.get("kMDItemAuthors");
  if (author && !metadata.artist) {
    metadata.author = author.replace(/[()"\s]/g, "");
  }

  const creator = attrs.get("kMDItemCreator");
  if (creator) metadata.creator = creator;

  return Object.keys(metadata).length > 0 ? metadata : null;
}
