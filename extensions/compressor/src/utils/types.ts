/**
 * Shared types and interfaces for file processing operations
 */

export enum OperationStage {
  Analyzing = "Analyzing file",
  Resizing = "Resizing",
  Compressing = "Compressing",
  Finalizing = "Finalizing",
}

export interface ProcessingOptions {
  compress?: boolean;
  resize?: boolean;
  resizePreset?: ResizePreset;
  outputFormat?: "webp" | "mp4" | "original";
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  originalSize?: number;
  processedSize?: number;
  error?: string;
  fileName?: string;
  fileType?: "image" | "video";
}

export type ProgressCallback = (stage: OperationStage, percentage: number, message?: string) => void;

export interface ResizePreset {
  name: string;
  description: string;
  maxWidth?: number;
  maxHeight?: number;
  width?: number;
  height?: number;
}

export interface BatchResult {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  totalOriginalSize: number;
  totalProcessedSize: number;
  results: ProcessingResult[];
  errors: Array<{ file: string; error: string }>;
}

// Predefined resize presets for images
export const IMAGE_PRESETS: ResizePreset[] = [
  {
    name: "Large",
    description: "1920px (max dimension)",
    maxWidth: 1920,
    maxHeight: 1920,
  },
  {
    name: "Medium",
    description: "1280px (recommended for web)",
    maxWidth: 1280,
    maxHeight: 1280,
  },
  {
    name: "Small",
    description: "800px",
    maxWidth: 800,
    maxHeight: 800,
  },
  {
    name: "Thumbnail",
    description: "400px",
    maxWidth: 400,
    maxHeight: 400,
  },
];

// Predefined resize presets for videos
export const VIDEO_PRESETS: ResizePreset[] = [
  {
    name: "1080p",
    description: "1920x1080 (Full HD)",
    width: 1920,
    height: 1080,
  },
  {
    name: "720p",
    description: "1280x720 (HD, recommended for web)",
    width: 1280,
    height: 720,
  },
  {
    name: "480p",
    description: "854x480 (SD)",
    width: 854,
    height: 480,
  },
];
