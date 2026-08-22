export type FileCategory = "video" | "image" | "audio" | "pdf" | "archive" | "unknown";

export type QualityMode = "smart_auto" | "strict_resolution" | "max_quality";

export interface CompressionOptions {
  inputPath: string;
  outputPath?: string;
  targetSizeMB: number;
  qualityMode: QualityMode;
  onProgress?: (progress: number, stageText: string) => void;
}

export interface CompressionResult {
  success: boolean;
  inputPath: string;
  outputPath: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  targetSizeBytes: number;
  compressionRatio: number; // percentage of original
  durationSeconds?: number;
  resolution?: {
    originalWidth?: number;
    originalHeight?: number;
    newWidth?: number;
    newHeight?: number;
  };
  details?: string;
  error?: string;
}

export interface DetectedFileInfo {
  path: string;
  name: string;
  extension: string;
  sizeBytes: number;
  category: FileCategory;
  mimeType?: string;
}

export interface SystemToolStatus {
  name: string;
  available: boolean;
  version?: string;
  path?: string;
  notes?: string;
}
