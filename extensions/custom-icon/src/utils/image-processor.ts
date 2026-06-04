import { Jimp } from "jimp";
import { tmpdir } from "os";
import { join, basename, extname } from "path";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { parseColor, hexToRgb, rgbToJimpColor, interpolateColor, isInsideRoundedRect, RGB } from "./color-utils";
import { TargetType } from "./app-utils";
import { existsSync } from "fs";
import { DEFAULT_FOLDER_COLOR } from "./constants";

/**
 * macOS App Icon specifications:
 * - Canvas size: 1024x1024 pixels
 * - Icon shape size: ~832x832 pixels (81.25% of canvas)
 * - Outer margin: ~96px on each side (9.375% of canvas) - transparent area
 * - Corner radius: ~22.37% of the icon shape size
 */
const MACOS_ICON_SIZE = 1024;
const MACOS_ICON_SHAPE_RATIO = 0.8125;
const MACOS_CORNER_RATIO = 0.225;
const MACOS_DEFAULT_PADDING = 10;

// Vertical rectangle A4 ratio ~1:1.4
const FILE_WIDTH_RATIO = 0.65;
const FILE_HEIGHT_RATIO = 0.85;
const FILE_CORNER_RATIO = 0.1;

// Horizontal rectangle
const FOLDER_WIDTH_RATIO = 0.85;
const FOLDER_HEIGHT_RATIO = 0.65;
const FOLDER_CORNER_RATIO = 0.1;

// Maximum dimension for processing images to avoid memory issues
const MAX_IMAGE_DIMENSION = 2048;

// Background configuration types
export type BackgroundConfig =
  | { type: "solid"; color: string }
  | { type: "gradient"; colors: string[] }
  | { type: "image"; imagePath: string };

interface ProcessIconOptions {
  iconPath: string;
  backgroundConfig: BackgroundConfig;
  padding: number;
  size?: number;
  targetType?: TargetType;
  useFolderIcon?: boolean;
  preserveImageDetails?: boolean;
  folderIconPath?: string;
}

// Use any for Jimp images to avoid complex type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JimpImage = any;

/**
 * Convert .icns file to PNG using macOS sips command
 * Returns path to temporary PNG file, or original path if not .icns
 */
function convertIcnsIfNeeded(imagePath: string): string {
  const ext = extname(imagePath).toLowerCase();
  if (ext !== ".icns") {
    return imagePath;
  }

  const outputPath = join(tmpdir(), `converted-${randomUUID()}.png`);
  try {
    execSync(`sips -s format png "${imagePath}" --out "${outputPath}"`, {
      stdio: "pipe",
      timeout: 10000,
    });
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to convert .icns file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Pre-process large images to avoid memory issues
 * Uses macOS sips to downscale images larger than MAX_IMAGE_DIMENSION
 * Returns path to resized image, or original path if already small enough
 */
function preprocessLargeImage(imagePath: string): string {
  const ext = extname(imagePath).toLowerCase();

  // Skip if already processed (temp file) or .icns (handled separately)
  if (ext === ".icns" || imagePath.includes(tmpdir())) {
    return imagePath;
  }

  try {
    // Get image dimensions using sips
    const sizeOutput = execSync(`sips -g pixelWidth -g pixelHeight "${imagePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });

    const widthMatch = /pixelWidth:\s*(\d+)/.exec(sizeOutput);
    const heightMatch = /pixelHeight:\s*(\d+)/.exec(sizeOutput);

    if (!widthMatch || !heightMatch) {
      return imagePath; // Can't determine size, use original
    }

    const width = parseInt(widthMatch[1], 10);
    const height = parseInt(heightMatch[1], 10);

    // If image is small enough, use it directly
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
      return imagePath;
    }

    // Calculate new dimensions maintaining aspect ratio
    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    // Create resized version using sips
    const outputPath = join(tmpdir(), `resized-${randomUUID()}.png`);
    execSync(`sips -s format png -z ${newHeight} ${newWidth} "${imagePath}" --out "${outputPath}"`, {
      stdio: "pipe",
      timeout: 15000,
    });

    return outputPath;
  } catch (error) {
    // If preprocessing fails, try to use original (may still crash, but worth trying)
    console.error("Failed to preprocess image:", error);
    return imagePath;
  }
}

/**
 * Read an image file, converting .icns to PNG if necessary
 * Also preprocesses large images to avoid memory issues
 */
async function readImage(imagePath: string, preprocessLarge = false): Promise<JimpImage> {
  let processedPath = convertIcnsIfNeeded(imagePath);

  // Preprocess large images if requested (mainly for background images)
  if (preprocessLarge) {
    processedPath = preprocessLargeImage(processedPath);
  }

  return Jimp.read(processedPath);
}

/**
 * Apply rounded corners to an image (mutates the image)
 */
function applyRoundedCorners(image: JimpImage, radius: number): void {
  const width = image.width;
  const height = image.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isInsideRoundedRect(x, y, width, height, radius)) {
        image.setPixelColor(0x00000000, x, y);
      }
    }
  }
}

/**
 * Convert an image to a monochrome silhouette with the given color
 */
function convertToSilhouette(image: JimpImage, color: string): void {
  const rgba = parseColor(color) || { r: 80, g: 80, b: 80, a: 255 };
  const width = image.width;
  const height = image.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelColor = image.getPixelColor(x, y);
      const alpha = pixelColor & 0xff;
      if (alpha > 0) {
        // Apply the silhouette color with original alpha
        image.setPixelColor(rgbToJimpColor(rgba.r, rgba.g, rgba.b, alpha), x, y);
      }
    }
  }
}

/**
 * Get base color from background config
 * Returns null if default folder color is used
 */
function getBaseColor(config: BackgroundConfig): RGB | null {
  if (config.type === "solid") {
    if (config.color === DEFAULT_FOLDER_COLOR) {
      return null; // No tinting
    }
    return hexToRgb(config.color);
  } else if (config.type === "gradient") {
    return hexToRgb(config.colors[0] || "#5a5a5a");
  }
  return { r: 90, g: 90, b: 90 }; // Default gray
}

/**
 * Tint an image with a color while preserving luminosity
 * This applies the color as a tint, making the image appear colored
 */
function applyColorTint(image: JimpImage, color: RGB): void {
  const width = image.width;
  const height = image.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = image.getPixelColor(x, y);
      const r = (pixel >> 24) & 0xff;
      const g = (pixel >> 16) & 0xff;
      const b = (pixel >> 8) & 0xff;
      const a = pixel & 0xff;

      if (a === 0) continue; // Skip transparent pixels

      // Calculate luminosity of original pixel (0-1)
      const luminosity = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Apply tint: blend the color with luminosity
      const tintedR = Math.round(color.r * luminosity);
      const tintedG = Math.round(color.g * luminosity);
      const tintedB = Math.round(color.b * luminosity);

      image.setPixelColor(rgbToJimpColor(tintedR, tintedG, tintedB, a), x, y);
    }
  }
}

/**
 * Apply a duotone effect: map image to color shades for visibility on folder
 * Uses inverted luminosity so the image contrasts well with the folder background
 * Light areas → dark shade, Dark areas → medium shade
 */
function applyDuotoneEffect(image: JimpImage, baseColor: RGB): void {
  const width = image.width;
  const height = image.height;

  // Create color range: dark shade (for light pixels) to medium shade (for dark pixels)
  // This inverts the image tonally so it contrasts with the lighter folder background
  const darkShade: RGB = {
    r: Math.round(baseColor.r * 0.25),
    g: Math.round(baseColor.g * 0.25),
    b: Math.round(baseColor.b * 0.25),
  };
  const mediumShade: RGB = {
    r: Math.round(baseColor.r * 0.55),
    g: Math.round(baseColor.g * 0.55),
    b: Math.round(baseColor.b * 0.55),
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = image.getPixelColor(x, y);
      const r = (pixel >> 24) & 0xff;
      const g = (pixel >> 16) & 0xff;
      const b = (pixel >> 8) & 0xff;
      const a = pixel & 0xff;

      if (a === 0) continue; // Skip transparent pixels

      // Calculate luminosity of original pixel (0-1)
      const luminosity = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Invert: light pixels (high luminosity) → dark shade, dark pixels → medium shade
      const invertedLuminosity = 1 - luminosity;
      const finalColor = interpolateColor(mediumShade, darkShade, invertedLuminosity);

      image.setPixelColor(rgbToJimpColor(finalColor.r, finalColor.g, finalColor.b, a), x, y);
    }
  }
}

/**
 * Apply a lighter duotone effect for default folder color
 * Uses higher multipliers for better visibility on the blue folder
 */
function applyDuotoneEffectLight(image: JimpImage, baseColor: RGB): void {
  const width = image.width;
  const height = image.height;

  // Use lighter shades for better visibility on default blue folder
  const darkShade: RGB = {
    r: Math.round(baseColor.r * 0.45),
    g: Math.round(baseColor.g * 0.45),
    b: Math.round(baseColor.b * 0.45),
  };
  const mediumShade: RGB = {
    r: Math.round(baseColor.r * 0.75),
    g: Math.round(baseColor.g * 0.75),
    b: Math.round(baseColor.b * 0.75),
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = image.getPixelColor(x, y);
      const r = (pixel >> 24) & 0xff;
      const g = (pixel >> 16) & 0xff;
      const b = (pixel >> 8) & 0xff;
      const a = pixel & 0xff;

      if (a === 0) continue; // Skip transparent pixels

      const luminosity = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const invertedLuminosity = 1 - luminosity;
      const finalColor = interpolateColor(mediumShade, darkShade, invertedLuminosity);

      image.setPixelColor(rgbToJimpColor(finalColor.r, finalColor.g, finalColor.b, a), x, y);
    }
  }
}

/**
 * Process an icon with background, padding, and rounded corners
 */
export async function processIcon(options: ProcessIconOptions): Promise<string> {
  const { iconPath, backgroundConfig, padding, size = 1024, targetType = "app", useFolderIcon = false } = options;

  // Handle folder with default macOS folder icon
  if (targetType === "folder" && useFolderIcon) {
    return processFolderWithDefaultIcon(options);
  }

  // Get shape dimensions based on target type
  const { shapeWidth, shapeHeight, cornerRatio } = getShapeDimensions(targetType, size);

  // Calculate margins to center the shape
  const marginX = Math.round((size - shapeWidth) / 2);
  const marginY = Math.round((size - shapeHeight) / 2);

  // Calculate content padding within the shape
  const minDimension = Math.min(shapeWidth, shapeHeight);
  const contentPaddingPx = Math.round((padding / 100) * minDimension);
  const contentWidth = shapeWidth - contentPaddingPx * 2;
  const contentHeight = shapeHeight - contentPaddingPx * 2;

  if (contentWidth <= 0 || contentHeight <= 0) {
    throw new Error("Padding too large, content size would be zero or negative");
  }

  // Create the background for the shape
  const iconShape = await createShapeBackground(shapeWidth, shapeHeight, backgroundConfig);

  // Load and resize the original icon to fit within content area (maintain aspect ratio)
  const icon = await readImage(iconPath);
  const iconAspect = icon.width / icon.height;
  const contentAspect = contentWidth / contentHeight;

  let resizeW: number, resizeH: number;
  if (iconAspect > contentAspect) {
    resizeW = contentWidth;
    resizeH = Math.round(contentWidth / iconAspect);
  } else {
    resizeH = contentHeight;
    resizeW = Math.round(contentHeight * iconAspect);
  }
  icon.resize({ w: resizeW, h: resizeH });

  // Center the icon within the content area
  const iconX = contentPaddingPx + Math.round((contentWidth - resizeW) / 2);
  const iconY = contentPaddingPx + Math.round((contentHeight - resizeH) / 2);
  iconShape.composite(icon, iconX, iconY);

  // Apply rounded corners to the shape
  const radius = Math.round(minDimension * cornerRatio);
  applyRoundedCorners(iconShape, radius);

  // Create the final canvas with transparent background
  const finalCanvas: JimpImage = new Jimp({
    width: size,
    height: size,
    color: 0x00000000,
  });

  // Composite the shape onto the center of the canvas
  finalCanvas.composite(iconShape, marginX, marginY);

  // Save to temp file
  const outputPath = join(tmpdir(), `icon-preview-${randomUUID()}.png`);
  await finalCanvas.write(outputPath as `${string}.${string}`);

  return outputPath;
}

/**
 * Get shape dimensions based on target type
 */
function getShapeDimensions(targetType: TargetType, size: number) {
  switch (targetType) {
    case "file":
      return {
        shapeWidth: Math.round(size * FILE_WIDTH_RATIO),
        shapeHeight: Math.round(size * FILE_HEIGHT_RATIO),
        cornerRatio: FILE_CORNER_RATIO,
      };
    case "folder":
      return {
        shapeWidth: Math.round(size * FOLDER_WIDTH_RATIO),
        shapeHeight: Math.round(size * FOLDER_HEIGHT_RATIO),
        cornerRatio: FOLDER_CORNER_RATIO,
      };
    case "app":
    default: {
      const shapeSize = Math.round(size * MACOS_ICON_SHAPE_RATIO);
      return {
        shapeWidth: shapeSize,
        shapeHeight: shapeSize,
        cornerRatio: MACOS_CORNER_RATIO,
      };
    }
  }
}

/**
 * Create a rectangular background (for non-square shapes)
 */
async function createShapeBackground(width: number, height: number, config: BackgroundConfig): Promise<JimpImage> {
  switch (config.type) {
    case "solid": {
      const rgba = parseColor(config.color) || { r: 255, g: 255, b: 255, a: 255 };
      return new Jimp({
        width,
        height,
        color: rgbToJimpColor(rgba.r, rgba.g, rgba.b, rgba.a),
      });
    }
    case "gradient": {
      const color1 = hexToRgb(config.colors[0] || "#FFFFFF");
      const color2 = hexToRgb(config.colors[1] || config.colors[0] || "#FFFFFF");
      const image = new Jimp({ width, height, color: 0x00000000 });
      for (let y = 0; y < height; y++) {
        const factor = y / (height - 1);
        const interpolated = interpolateColor(color1, color2, factor);
        const jimpColor = rgbToJimpColor(interpolated.r, interpolated.g, interpolated.b, 255);
        for (let x = 0; x < width; x++) {
          image.setPixelColor(jimpColor, x, y);
        }
      }
      return image;
    }
    case "image": {
      // Preprocess large background images to avoid memory issues
      const bgImage = await readImage(config.imagePath, true);
      const aspectRatio = bgImage.width / bgImage.height;
      const targetAspect = width / height;
      let newWidth: number, newHeight: number;
      if (aspectRatio > targetAspect) {
        newHeight = height;
        newWidth = Math.round(height * aspectRatio);
      } else {
        newWidth = width;
        newHeight = Math.round(width / aspectRatio);
      }
      bgImage.resize({ w: newWidth, h: newHeight });
      const cropX = Math.round((newWidth - width) / 2);
      const cropY = Math.round((newHeight - height) / 2);
      bgImage.crop({ x: cropX, y: cropY, w: width, h: height });
      return bgImage;
    }
    default:
      return new Jimp({ width, height, color: 0xffffffff });
  }
}

/**
 * Process folder icon with folder overlay + user image
 * The folder is tinted with the chosen color, and the image is colorized as a darker shade
 */
async function processFolderWithDefaultIcon(options: ProcessIconOptions): Promise<string> {
  const { iconPath, backgroundConfig, padding, size = 1024, preserveImageDetails = true, folderIconPath } = options;

  if (!folderIconPath || !existsSync(folderIconPath)) {
    throw new Error("Folder icon not found. Please check the extension assets.");
  }

  // Get the base color from config (null means default/no tinting)
  const baseColor = getBaseColor(backgroundConfig);
  const useDefaultColor = baseColor === null;

  // Default color for overlay: a darker blue that contrasts with the folder
  // Using higher values since duotone/silhouette will darken them further
  const defaultOverlayColor: RGB = { r: 90, g: 205, b: 255 };
  const effectiveColor = baseColor || defaultOverlayColor;

  // Load the folder icon from bundled assets
  const folderIcon = await readImage(folderIconPath);
  folderIcon.resize({ w: size, h: size });

  // Apply color tint to the folder icon (skip if using default)
  if (!useDefaultColor) {
    applyColorTint(folderIcon, baseColor);
  }

  // Load the user's image
  const userImage = await readImage(iconPath);

  // Calculate overlay size (with padding) - 50% of canvas for better visibility
  const overlayMaxSize = Math.round(size * 0.5);
  const paddingFactor = 1 - padding / 100;
  const overlaySize = Math.round(overlayMaxSize * paddingFactor);

  // Maintain aspect ratio
  const aspect = userImage.width / userImage.height;
  let overlayW: number, overlayH: number;
  if (aspect > 1) {
    overlayW = overlaySize;
    overlayH = Math.round(overlaySize / aspect);
  } else {
    overlayH = overlaySize;
    overlayW = Math.round(overlaySize * aspect);
  }
  userImage.resize({ w: overlayW, h: overlayH });

  // Apply color effect based on mode
  if (preserveImageDetails) {
    if (useDefaultColor) {
      // For default: use lighter shades that look good on blue folder
      applyDuotoneEffectLight(userImage, effectiveColor);
    } else {
      // Duotone effect: preserve image details with color shades
      applyDuotoneEffect(userImage, effectiveColor);
    }
  } else {
    // Flat silhouette mode
    const silhouetteFactor = useDefaultColor ? 0.6 : 0.4; // Lighter for default
    const silhouetteRgb: RGB = {
      r: Math.round(effectiveColor.r * silhouetteFactor),
      g: Math.round(effectiveColor.g * silhouetteFactor),
      b: Math.round(effectiveColor.b * silhouetteFactor),
    };
    const silhouetteColorStr = `rgb(${silhouetteRgb.r},${silhouetteRgb.g},${silhouetteRgb.b})`;
    convertToSilhouette(userImage, silhouetteColorStr);
  }

  // Position overlay at the folder's visual center (lower than geometric center)
  // The folder "face" is approximately at 58% from the top
  const folderFaceY = Math.round(size * 0.58);
  const overlayX = Math.round((size - overlayW) / 2);
  const overlayY = folderFaceY - Math.round(overlayH / 2);

  // Composite overlay onto folder
  folderIcon.composite(userImage, overlayX, overlayY);

  // Save to temp file
  const outputPath = join(tmpdir(), `icon-preview-${randomUUID()}.png`);
  await folderIcon.write(outputPath as `${string}.${string}`);

  return outputPath;
}

/**
 * Generate a preview image (smaller size for faster rendering)
 */
export async function generatePreview(options: ProcessIconOptions): Promise<string> {
  return processIcon({ ...options, size: 512 });
}

/**
 * Generate the final icon (always 1024x1024)
 */
export async function generateFinalIcon(options: ProcessIconOptions): Promise<string> {
  return processIcon({ ...options, size: MACOS_ICON_SIZE });
}

/**
 * Get target type label for UI
 */
export function getTargetTypeLabel(targetType: TargetType): string {
  switch (targetType) {
    case "app":
      return "Application";
    case "file":
      return "File";
    case "folder":
      return "Folder";
  }
}

/**
 * Get background description for UI
 */
export function getBackgroundDescription(config: BackgroundConfig): string {
  switch (config.type) {
    case "solid":
      return config.color;
    case "gradient":
      return `${config.colors[0]} → ${config.colors[1]}`;
    case "image":
      return basename(config.imagePath);
    default:
      return "Unknown";
  }
}

/**
 * Export default padding for UI components
 */
export const DEFAULT_ICON_PADDING = MACOS_DEFAULT_PADDING;
