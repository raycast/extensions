/**
 * Variable resolver for template system
 *
 * Resolves template variables against file context and metadata.
 */

import { TemplateDateSource, type TemplateContext, type TemplateVariableToken } from "../../types";
import {
  formatDate,
  formatTime,
  formatNumber,
  formatSize,
  formatDuration,
  generateRandom,
  generateUUID,
} from "./formatters";

/**
 * Resolve a variable token to its string value
 *
 * @param token - Variable token from parser
 * @param context - Template context with file info and metadata
 * @returns Resolved string value
 */
export function resolveVariable(token: TemplateVariableToken, context: TemplateContext): string {
  const { name, format } = token;

  // Handle dot-notation (e.g., "exif.dateTaken", "file.size")
  const parts = name.split(".");
  const baseName = parts[0];
  const subName = parts.slice(1).join(".");

  switch (baseName) {
    case "original":
      return context.file.baseName;

    case "extension":
      return context.file.extension;

    case "counter":
      return resolveCounter(context, format);

    case "date":
      return resolveDate(context, format);

    case "time":
      return resolveTime(context, format);

    case "year":
      return resolveYear(context);

    case "month":
      return resolveMonth(context, format);

    case "day":
      return resolveDay(context, format);

    case "hour":
      return resolveHour(context, format);

    case "minute":
      return resolveMinute(context, format);

    case "second":
      return resolveSecond(context, format);

    case "random":
      return resolveRandom(format);

    case "uuid":
      return generateUUID();

    case "file":
      return resolveFileMetadata(subName, context, format);

    case "exif":
      return resolveExifMetadata(subName, context, format);

    case "spotlight":
      return resolveSpotlightMetadata(subName, context);

    default:
      // Return the original placeholder for unknown variables
      return token.fullMatch;
  }
}

/**
 * Get the effective date based on date source
 */
function getEffectiveDate(context: TemplateContext): Date {
  const { dateSource, metadata } = context;

  switch (dateSource) {
    case TemplateDateSource.EXIF:
      if (metadata?.exif?.dateTaken) {
        return metadata.exif.dateTaken;
      }
      // Fall through to modified if no EXIF date
      return metadata?.modified || new Date();

    case TemplateDateSource.CREATED:
      return metadata?.created || new Date();

    case TemplateDateSource.MODIFIED:
      return metadata?.modified || new Date();

    case TemplateDateSource.NOW:
    default:
      return new Date();
  }
}

function resolveCounter(context: TemplateContext, format?: string): string {
  const { index, counter } = context;
  const value = counter.start + index * counter.step;
  const padding = format ? format.length : counter.padding;
  return formatNumber(value, "0".repeat(padding));
}

function resolveDate(context: TemplateContext, format?: string): string {
  const date = getEffectiveDate(context);
  return formatDate(date, format || "YYYY-MM-DD");
}

function resolveTime(context: TemplateContext, format?: string): string {
  const date = getEffectiveDate(context);
  return formatTime(date, format || "HH-mm-ss");
}

function resolveYear(context: TemplateContext): string {
  const date = getEffectiveDate(context);
  return String(date.getFullYear());
}

function resolveMonth(context: TemplateContext, format?: string): string {
  const date = getEffectiveDate(context);
  const month = date.getMonth() + 1;
  return format === "MM" || format === "00" ? String(month).padStart(2, "0") : String(month);
}

function resolveDay(context: TemplateContext, format?: string): string {
  const date = getEffectiveDate(context);
  const day = date.getDate();
  return format === "DD" || format === "00" ? String(day).padStart(2, "0") : String(day);
}

function resolveHour(context: TemplateContext, format?: string): string {
  const date = getEffectiveDate(context);
  const hour = date.getHours();
  return format === "HH" || format === "00" ? String(hour).padStart(2, "0") : String(hour);
}

function resolveMinute(context: TemplateContext, format?: string): string {
  const date = getEffectiveDate(context);
  const minute = date.getMinutes();
  return format === "mm" || format === "00" ? String(minute).padStart(2, "0") : String(minute);
}

function resolveSecond(context: TemplateContext, format?: string): string {
  const date = getEffectiveDate(context);
  const second = date.getSeconds();
  return format === "ss" || format === "00" ? String(second).padStart(2, "0") : String(second);
}

function resolveRandom(format?: string): string {
  if (!format) return generateRandom(6);
  const parsed = parseInt(format, 10);
  const length = Number.isInteger(parsed) ? Math.max(1, parsed) : format.length;
  return generateRandom(length);
}

function resolveFileMetadata(property: string, context: TemplateContext, format?: string): string {
  const { metadata } = context;

  switch (property) {
    case "size":
      return metadata?.size !== undefined ? String(metadata.size) : "";

    case "sizeFormatted":
      return metadata?.size !== undefined ? formatSize(metadata.size) : "";

    case "created":
      return metadata?.created ? formatDate(metadata.created, format) : "";

    case "modified":
      return metadata?.modified ? formatDate(metadata.modified, format) : "";

    default:
      return "";
  }
}

function resolveExifMetadata(property: string, context: TemplateContext, format?: string): string {
  const exif = context.metadata?.exif;
  if (!exif) return "";

  switch (property) {
    case "dateTaken":
      return exif.dateTaken ? formatDate(exif.dateTaken, format) : "";

    case "dimensions":
      return exif.width && exif.height ? `${exif.width}x${exif.height}` : "";

    case "width":
      return exif.width ? String(exif.width) : "";

    case "height":
      return exif.height ? String(exif.height) : "";

    case "camera":
      // Prefer model, fall back to make
      return exif.cameraModel || exif.cameraMake || "";

    case "cameraMake":
    case "make": // backward-compatible alias
      return exif.cameraMake || "";

    case "cameraModel":
    case "model": // backward-compatible alias
      return exif.cameraModel || "";

    default:
      return "";
  }
}

function resolveSpotlightMetadata(property: string, context: TemplateContext): string {
  const spotlight = context.metadata?.spotlight;
  if (!spotlight) return "";

  switch (property) {
    case "duration":
      return spotlight.duration !== undefined ? String(Math.round(spotlight.duration)) : "";

    case "durationFormatted":
      return spotlight.duration !== undefined ? formatDuration(spotlight.duration) : "";

    case "artist":
      return spotlight.artist || "";

    case "album":
      return spotlight.album || "";

    case "title":
      return spotlight.title || "";

    case "pixelWidth":
      return spotlight.pixelWidth !== undefined ? String(spotlight.pixelWidth) : "";

    case "pixelHeight":
      return spotlight.pixelHeight !== undefined ? String(spotlight.pixelHeight) : "";

    case "pageCount":
      return spotlight.pageCount !== undefined ? String(spotlight.pageCount) : "";

    case "audioChannelCount":
      return spotlight.audioChannelCount !== undefined ? String(spotlight.audioChannelCount) : "";

    case "audioBitRate":
      return spotlight.audioBitRate !== undefined ? String(spotlight.audioBitRate) : "";

    default:
      return "";
  }
}

/**
 * Check if a variable requires metadata to resolve
 */
export function requiresMetadata(variableName: string): boolean {
  const parts = variableName.split(".");
  const baseName = parts[0]!;

  return ["file", "exif", "spotlight"].includes(baseName);
}

/**
 * Check if a variable requires EXIF data
 */
export function requiresExif(variableName: string): boolean {
  return variableName.startsWith("exif.");
}

/**
 * Check if a variable requires Spotlight metadata
 */
export function requiresSpotlight(variableName: string): boolean {
  return variableName.startsWith("spotlight.");
}

/**
 * Get the date source required by a template
 * Returns EXIF date source if any exif-prefixed variables are present
 */
export function getRequiredDateSource(variables: string[]): TemplateDateSource | null {
  if (variables.some((v) => v.startsWith("exif."))) {
    return TemplateDateSource.EXIF;
  }
  return null;
}
