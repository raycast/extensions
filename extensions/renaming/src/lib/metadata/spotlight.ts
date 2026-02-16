/**
 * macOS Spotlight metadata via mdls command
 *
 * Two-layer design:
 * - getRawSpotlightAttributes() returns ALL kMDItem attributes from mdls as a raw Map
 * - getSpotlightMetadata() maps a curated subset into the typed SpotlightMetadata interface
 *
 * To access a new kMDItem key, add it to getSpotlightMetadata() — no changes needed in the extraction layer.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import type { SpotlightMetadata } from "./types";
import { log } from "../logger";

const execFileAsync = promisify(execFile);

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
 * Parse mdls output into key-value pairs.
 * Handles both single-line values and multi-line parenthesized arrays.
 */
function parseMdlsOutput(output: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = output.split("\n");

  let i = 0;
  while (i < lines.length) {
    const match = lines[i]!.match(/^(\w+)\s+=\s+(.+)$/);
    if (match) {
      const key = match[1]!;
      let value = match[2]!;

      // Handle multi-line parenthesized arrays: value starts with "("
      if (value === "(" || (value.startsWith("(") && !value.endsWith(")"))) {
        const arrayLines: string[] = [value];
        i++;
        while (i < lines.length) {
          const line = lines[i]!;
          arrayLines.push(line.trim());
          if (line.trim() === ")" || line.trim().endsWith(")")) break;
          i++;
        }
        value = arrayLines.join(" ");
      }

      if (key && value && value !== "(null)") {
        // Clean up parenthesized array values: ( "a", "b" ) → a, b
        const cleaned = value
          .replace(/^\(\s*/, "")
          .replace(/\s*\)$/, "")
          .replace(/"/g, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(", ");
        result.set(key, cleaned || value.replace(/^"(.+)"$/, "$1"));
      }
    }
    i++;
  }

  return result;
}

/**
 * Get all Spotlight metadata attributes for a file as raw key-value pairs.
 * Returns the full mdls output — consumers pick the keys they need.
 */
export async function getRawSpotlightAttributes(filePath: string): Promise<Map<string, string> | null> {
  try {
    const { stdout } = await execFileAsync("mdls", [filePath], { timeout: 5000 });
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
    const parsed = parseFloat(duration);
    if (Number.isFinite(parsed)) {
      metadata.duration = parsed;
      metadata.durationFormatted = formatDuration(parsed);
    }
  }

  // Image/video dimensions
  const pixelWidth = attrs.get("kMDItemPixelWidth");
  if (pixelWidth) {
    const parsed = parseInt(pixelWidth, 10);
    if (Number.isFinite(parsed)) metadata.pixelWidth = parsed;
  }
  const pixelHeight = attrs.get("kMDItemPixelHeight");
  if (pixelHeight) {
    const parsed = parseInt(pixelHeight, 10);
    if (Number.isFinite(parsed)) metadata.pixelHeight = parsed;
  }

  // Audio properties
  const audioChannels = attrs.get("kMDItemAudioChannelCount");
  if (audioChannels) {
    const parsed = parseInt(audioChannels, 10);
    if (Number.isFinite(parsed)) metadata.audioChannels = parsed;
  }

  const audioBitRate = attrs.get("kMDItemAudioBitRate");
  if (audioBitRate) {
    const parsed = parseInt(audioBitRate, 10);
    if (Number.isFinite(parsed)) metadata.audioBitRate = parsed;
  }

  const audioSampleRate = attrs.get("kMDItemAudioSampleRate");
  if (audioSampleRate) {
    const parsed = parseInt(audioSampleRate, 10);
    if (Number.isFinite(parsed)) metadata.audioSampleRate = parsed;
  }

  // Video properties
  const videoBitRate = attrs.get("kMDItemTotalBitRate");
  if (videoBitRate) {
    const parsed = parseInt(videoBitRate, 10);
    if (Number.isFinite(parsed)) metadata.videoBitRate = parsed;
  }

  const frameRate = attrs.get("kMDItemVideoFrameRate");
  if (frameRate) {
    const parsed = parseFloat(frameRate);
    if (Number.isFinite(parsed)) metadata.frameRate = parsed;
  }

  // Codec
  const codecs = attrs.get("kMDItemCodecs");
  if (codecs) {
    // Format: ("codec1", "codec2") -> clean it up
    metadata.codec = codecs
      .replace(/[()"]/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
  }

  // Audio metadata (music files)
  const artist = attrs.get("kMDItemAuthors");
  if (artist) metadata.artist = artist.replace(/[()"]/g, "").trim();

  const album = attrs.get("kMDItemAlbum");
  if (album) metadata.album = album;

  const title = attrs.get("kMDItemTitle");
  if (title) metadata.title = title;

  const composer = attrs.get("kMDItemComposer");
  if (composer) metadata.composer = composer;

  const genre = attrs.get("kMDItemMusicalGenre");
  if (genre) metadata.genre = genre;

  const year = attrs.get("kMDItemRecordingYear");
  if (year) {
    const parsed = parseInt(year, 10);
    if (Number.isFinite(parsed)) metadata.year = parsed;
  }

  // Document metadata
  const pageCount = attrs.get("kMDItemNumberOfPages");
  if (pageCount) {
    const parsed = parseInt(pageCount, 10);
    if (Number.isFinite(parsed)) metadata.pageCount = parsed;
  }

  const creator = attrs.get("kMDItemCreator");
  if (creator) metadata.creator = creator;

  // Use kMDItemCreator for document author (distinct from music artist which uses kMDItemAuthors above)
  const author = creator || attrs.get("kMDItemAuthors");
  if (author) {
    metadata.author = author.replace(/[()"]/g, "").trim();
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}
