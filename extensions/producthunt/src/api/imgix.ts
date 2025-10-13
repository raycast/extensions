/**
 * Utility functions for handling imgix image URLs
 * Based on the imgix API documentation: https://docs.imgix.com/en-US/apis/rendering
 */

/**
 * Image format options supported by imgix
 * @see https://docs.imgix.com/en-US/apis/rendering/format
 */
export enum ImgixFormat {
  PNG = "png",
  JPG = "jpg",
  WEBP = "webp",
  AVIF = "avif",
  GIF = "gif",
  JP2 = "jp2",
  JXRPB = "jxrpb",
  PJPG = "pjpg",
}

/**
 * Image fit options supported by imgix
 * @see https://docs.imgix.com/en-US/apis/rendering/size/fit
 */
export enum ImgixFit {
  CLAMP = "clamp",
  CLIP = "clip",
  CROP = "crop",
  FACEAREA = "facearea",
  FILL = "fill",
  FILLMAX = "fillmax",
  MAX = "max",
  MIN = "min",
  SCALE = "scale",
}

/**
 * Options for processing an image URL with imgix
 */
export interface ImgixOptions {
  width?: number;
  height?: number;
  format?: ImgixFormat;
  fit?: ImgixFit;
  quality?: number;
  auto?: string[];
  dpr?: number;
  bg?: string;
  pad?: number;
}

/**
 * Process an image URL with imgix parameters
 * @param url The original image URL
 * @param options The imgix options to apply
 * @returns The processed image URL
 */
export function processImageUrl(url: string, options: ImgixOptions = {}): string {
  if (!url) return "";

  try {
    // If the URL is not already an imgix URL and doesn't start with http, return as is
    if (!url.includes("imgix.net") && !url.startsWith("http")) {
      return url;
    }

    // Parse the URL
    const parsedUrl = new URL(url);

    // Apply imgix parameters
    if (options.width) {
      parsedUrl.searchParams.set("w", options.width.toString());
    }

    if (options.height) {
      parsedUrl.searchParams.set("h", options.height.toString());
    }

    if (options.format) {
      parsedUrl.searchParams.set("fm", options.format);
    }

    if (options.fit) {
      parsedUrl.searchParams.set("fit", options.fit);
    }

    if (options.quality) {
      parsedUrl.searchParams.set("q", options.quality.toString());
    }

    if (options.auto && options.auto.length > 0) {
      parsedUrl.searchParams.set("auto", options.auto.join(","));
    }

    if (options.dpr) {
      parsedUrl.searchParams.set("dpr", options.dpr.toString());
    }

    if (options.bg) {
      parsedUrl.searchParams.set("bg", options.bg);
    }

    if (options.pad) {
      parsedUrl.searchParams.set("pad", options.pad.toString());
    }

    return parsedUrl.toString();
  } catch (error) {
    try {
      import("../util/logger")
        .then(({ getLogger }) => {
          const log = getLogger("imgix");
          log.error("imgix:process_error", error, { url });
        })
        .catch(() => void 0);
    } catch {
      // ignore
    }
    return url;
  }
}

/**
 * Process a thumbnail URL with configurable dimensions
 * @param url The original thumbnail URL
 * @param options Configuration options for the image processing
 * @param options.isDetailView Whether this is for a detail view (larger image) or list view (smaller image)
 * @returns The processed thumbnail URL
 */
export function processThumbnail(url: string, options: { isDetailView?: boolean } = {}): string {
  if (!url) return "";

  const { isDetailView = false } = options;

  // Default dimensions based on view type
  const width = isDetailView ? 1024 : 64;
  const height = isDetailView ? 512 : 64;
  const quality = isDetailView ? 80 : undefined;

  try {
    // Handle SVG images - convert to PNG format
    if (url.includes(".svg")) {
      return processImageUrl(url, {
        format: ImgixFormat.PNG,
        width,
        height,
        fit: ImgixFit.CROP,
        auto: ["format"],
        ...(quality !== undefined ? { quality } : {}),
      });
    }

    // For other image types
    return processImageUrl(url, {
      width,
      height,
      fit: ImgixFit.CROP,
      auto: ["format", "compress"],
      ...(quality !== undefined ? { quality } : {}),
    });
  } catch (error) {
    try {
      import("../util/logger")
        .then(({ getLogger }) => {
          const log = getLogger("imgix");
          log.error("imgix:thumbnail_error", error, { url, isDetailView });
        })
        .catch(() => void 0);
    } catch {
      // ignore
    }
    return url;
  }
}
