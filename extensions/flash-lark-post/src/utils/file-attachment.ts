import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { readFileSync, statSync } from "fs";
import { basename, extname } from "path";

export interface AttachedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  data?: string; // Base64エンコードされたデータ
  mimeType?: string; // MIMEタイプ
  lastModified?: Date; // 最終更新日時
}

// サポートされているファイルタイプ
const SUPPORTED_IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
const SUPPORTED_DOCUMENT_TYPES = [".pdf", ".doc", ".docx", ".txt", ".md", ".csv", ".xlsx", ".xls"];
const SUPPORTED_VIDEO_TYPES = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_FILE_SIZE = 50 * 1024 * 1024; // 50MB for video files

// ファイルタイプを判定
export function getFileType(filePath: string): "image" | "document" | "video" | "other" {
  const ext = extname(filePath).toLowerCase();

  if (SUPPORTED_IMAGE_TYPES.includes(ext)) {
    return "image";
  } else if (SUPPORTED_DOCUMENT_TYPES.includes(ext)) {
    return "document";
  } else if (SUPPORTED_VIDEO_TYPES.includes(ext)) {
    return "video";
  } else {
    return "other";
  }
}

// ファイルサイズを人間が読みやすい形式に変換
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ファイルを検証
export function validateFile(filePath: string): { valid: boolean; error?: string } {
  try {
    const stats = statSync(filePath);

    if (!stats.isFile()) {
      return { valid: false, error: "選択されたアイテムはファイルではありません" };
    }

    const fileType = getFileType(filePath);
    const maxSize = fileType === "video" ? MAX_VIDEO_FILE_SIZE : MAX_FILE_SIZE;

    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `ファイルサイズが大きすぎます (最大: ${formatFileSize(maxSize)})`,
      };
    }

    if (fileType === "other") {
      return {
        valid: false,
        error: "サポートされていないファイル形式です",
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "ファイルの読み込みに失敗しました" };
  }
}

// ファイルをBase64エンコード
export function encodeFileToBase64(filePath: string): string {
  try {
    const fileBuffer = readFileSync(filePath);
    return fileBuffer.toString("base64");
  } catch {
    throw new Error("ファイルのエンコードに失敗しました");
  }
}

// Finderで選択されたファイルを取得
// ファイルタイプフィルターのオプション
export interface FileFilterOptions {
  allowImages?: boolean;
  allowDocuments?: boolean;
  allowVideos?: boolean;
  allowOther?: boolean;
  maxFiles?: number;
  customExtensions?: string[];
}

// 改善されたファイル選択機能
export async function getSelectedFiles(options: FileFilterOptions = {}): Promise<AttachedFile[]> {
  const {
    allowImages = true,
    allowDocuments = true,
    allowVideos = true,
    allowOther = true,
    maxFiles = 10,
    customExtensions = [],
  } = options;

  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      throw new Error(
        "ファイルが選択されていません。Finderでファイルを選択してからCmd+Fを押してください。"
      );
    }

    const attachedFiles: AttachedFile[] = [];
    const errors: string[] = [];
    const skippedFiles: string[] = [];

    for (const item of selectedItems) {
      // ファイル数制限チェック
      if (attachedFiles.length >= maxFiles) {
        skippedFiles.push(`${basename(item.path)} (最大${maxFiles}ファイルまで)`);
        continue;
      }

      const validation = validateFile(item.path);
      if (!validation.valid) {
        errors.push(`${basename(item.path)}: ${validation.error}`);
        continue;
      }

      const fileType = getFileType(item.path);
      const extension = extname(item.path).toLowerCase();

      // ファイルタイプフィルターチェック
      const isAllowed =
        (fileType === "image" && allowImages) ||
        (fileType === "document" && allowDocuments) ||
        (fileType === "video" && allowVideos) ||
        (fileType === "other" && allowOther) ||
        customExtensions.includes(extension);

      if (!isAllowed) {
        skippedFiles.push(`${basename(item.path)} (サポートされていないファイルタイプ)`);
        continue;
      }

      const stats = statSync(item.path);
      const attachedFile: AttachedFile = {
        id: generateFileId(),
        name: basename(item.path),
        path: item.path,
        size: stats.size,
        type: fileType,
        data: encodeFileToBase64(item.path),
        mimeType: getMimeType(item.path),
        lastModified: stats.mtime,
      };

      attachedFiles.push(attachedFile);
    }

    // 結果の報告
    if (attachedFiles.length > 0) {
      await showToast({
        style: Toast.Style.Success,
        title: `${attachedFiles.length}個のファイルを添付しました`,
        message: attachedFiles.map((f) => f.name).join(", "),
      });
    }

    // エラーとスキップされたファイルの報告
    if (errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${errors.length}個のファイルでエラー`,
        message: errors.slice(0, 3).join(", ") + (errors.length > 3 ? "..." : ""),
      });
    }

    if (skippedFiles.length > 0) {
      await showToast({
        style: Toast.Style.Animated,
        title: `${skippedFiles.length}個のファイルをスキップ`,
        message: skippedFiles.slice(0, 3).join(", ") + (skippedFiles.length > 3 ? "..." : ""),
      });
    }

    return attachedFiles;
  } catch (error) {
    throw new Error(`ファイルの取得に失敗しました: ${String(error)}`);
  }
}

// スクリーンショットを撮影（macOSのscreencaptureコマンドを使用）
export async function takeScreenshot(): Promise<AttachedFile | null> {
  try {
    const { execSync } = require("child_process");
    const tmpPath = `/tmp/raycast-screenshot-${Date.now()}.png`;

    // macOSのスクリーンショット機能を使用
    execSync(`screencapture -i "${tmpPath}"`);

    // ファイルが作成されたかチェック
    const stats = statSync(tmpPath);
    if (stats.size === 0) {
      // ユーザーがキャンセルした場合
      return null;
    }

    const attachedFile: AttachedFile = {
      id: generateFileId(),
      name: `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`,
      path: tmpPath,
      size: stats.size,
      type: "image",
      data: encodeFileToBase64(tmpPath),
    };

    await showToast({
      style: Toast.Style.Success,
      title: "スクリーンショットを撮影しました",
    });

    return attachedFile;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "スクリーンショットの撮影に失敗しました",
      message: String(error),
    });
    return null;
  }
}

// ファイルIDを生成
function generateFileId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ファイル管理機能
export function removeFileById(files: AttachedFile[], fileId: string): AttachedFile[] {
  return files.filter((file) => file.id !== fileId);
}

export function getTotalFileSize(files: AttachedFile[]): number {
  return files.reduce((total, file) => total + file.size, 0);
}

export function getFileSizeLimit(): number {
  return MAX_FILE_SIZE;
}

export function getTotalSizeLimit(): number {
  return MAX_FILE_SIZE * 5; // 合計50MB制限
}

export function validateTotalSize(files: AttachedFile[]): { valid: boolean; error?: string } {
  const totalSize = getTotalFileSize(files);
  const limit = getTotalSizeLimit();

  if (totalSize > limit) {
    return {
      valid: false,
      error: `合計ファイルサイズが制限を超えています (${formatFileSize(totalSize)} / ${formatFileSize(limit)})`,
    };
  }

  return { valid: true };
}

export function getFileIcon(file: AttachedFile): string {
  switch (file.type) {
    case "image":
      return "🖼️";
    case "video":
      return "🎬";
    case "document": {
      const ext = file.name.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "pdf":
          return "📄";
        case "doc":
        case "docx":
          return "📝";
        case "xls":
        case "xlsx":
          return "📊";
        case "txt":
        case "md":
          return "📃";
        default:
          return "📄";
      }
    }
    default:
      return "📎";
  }
}

export function formatFileInfo(file: AttachedFile): string {
  const icon = getFileIcon(file);
  const size = formatFileSize(file.size);
  const modified = file.lastModified ? ` (更新: ${file.lastModified.toLocaleDateString()})` : "";

  return `${icon} ${file.name} (${size})${modified}`;
}

// MIMEタイプを取得
export function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();

  const mimeTypes: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".wmv": "video/x-ms-wmv",
    ".flv": "video/x-flv",
    ".webm": "video/webm",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
  };

  return mimeTypes[ext] || "application/octet-stream";
}
