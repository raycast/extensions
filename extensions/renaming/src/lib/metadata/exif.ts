/**
 * EXIF metadata extraction for images
 */

import { readFile } from "fs/promises";
import ExifReader from "exifreader";
import type { ImageExifMetadata } from "./types";
import { log } from "../logger";

/**
 * Format shutter speed from decimal to fraction
 */
function formatShutterSpeed(value: number): string {
  if (value >= 1) {
    return `${value}s`;
  }
  const denominator = Math.round(1 / value);
  return `1/${denominator}s`;
}

/**
 * Format GPS coordinates to decimal degrees string
 */
function formatGpsCoordinate(degrees: number, isLatitude: boolean): string {
  const direction = isLatitude ? (degrees >= 0 ? "N" : "S") : degrees >= 0 ? "E" : "W";
  return `${Math.abs(degrees).toFixed(6)}° ${direction}`;
}

/**
 * Get EXIF metadata from an image file
 */
export async function getExifMetadata(filePath: string): Promise<ImageExifMetadata | null> {
  try {
    const buffer = await readFile(filePath);
    const tags = ExifReader.load(buffer, { expanded: true });

    const metadata: ImageExifMetadata = {};

    // Dimensions
    const width = tags.file?.["Image Width"]?.value || tags.exif?.PixelXDimension?.value;
    const height = tags.file?.["Image Height"]?.value || tags.exif?.PixelYDimension?.value;

    if (width && height) {
      metadata.width = Number(width);
      metadata.height = Number(height);
      metadata.dimensions = `${width} × ${height}`;
    }

    // Camera info
    const make = tags.exif?.Make?.description;
    const model = tags.exif?.Model?.description;

    if (make) metadata.cameraMake = make;
    if (model) metadata.cameraModel = model;
    if (make && model) {
      // Clean up redundant make in model name
      metadata.camera = model.startsWith(make) ? model : `${make} ${model}`;
    } else if (model) {
      metadata.camera = model;
    }

    // Exposure settings
    const iso = tags.exif?.ISOSpeedRatings?.value;
    if (iso) metadata.iso = Number(iso);

    const aperture = tags.exif?.FNumber?.value;
    if (aperture && Array.isArray(aperture)) {
      const fNumber = aperture[0] / aperture[1];
      metadata.aperture = `f/${fNumber.toFixed(1)}`;
    }

    const exposureTime = tags.exif?.ExposureTime?.value;
    if (exposureTime && Array.isArray(exposureTime)) {
      const seconds = exposureTime[0] / exposureTime[1];
      metadata.shutterSpeed = formatShutterSpeed(seconds);
    }

    const focalLength = tags.exif?.FocalLength?.value;
    if (focalLength && Array.isArray(focalLength)) {
      const mm = focalLength[0] / focalLength[1];
      metadata.focalLength = `${mm.toFixed(0)}mm`;
    }

    // Date taken
    const dateTimeOriginal = tags.exif?.DateTimeOriginal?.description;
    if (dateTimeOriginal) {
      // Format: "2024:01:15 14:30:00" -> parse to Date
      const [datePart, timePart] = dateTimeOriginal.split(" ");
      const [year, month, day] = datePart!.split(":");
      const isoString = `${year}-${month}-${day}T${timePart}`;
      metadata.dateTaken = new Date(isoString);
    }

    // GPS
    if (tags.gps?.Latitude && tags.gps?.Longitude) {
      metadata.gpsLatitude = tags.gps.Latitude;
      metadata.gpsLongitude = tags.gps.Longitude;
      metadata.gpsLocation = `${formatGpsCoordinate(tags.gps.Latitude, true)}, ${formatGpsCoordinate(tags.gps.Longitude, false)}`;
    }

    // Color space
    const colorSpace = tags.exif?.ColorSpace?.description;
    if (colorSpace) metadata.colorSpace = colorSpace;

    // Orientation
    const orientation = tags.exif?.Orientation?.description;
    if (orientation) metadata.orientation = orientation;

    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch (error) {
    log.metadata.warn(`Failed to read EXIF metadata from "${filePath}"`, error);
    return null;
  }
}
