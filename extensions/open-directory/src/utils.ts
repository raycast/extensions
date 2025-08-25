import { statSync, readdirSync, readFileSync } from "fs";
import { extname, basename, dirname } from "path";

/**
 * Format file size in bytes to human readable format
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format dates with relative time information
 */
export function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  let relative = "";
  if (diffDays > 0) {
    relative = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    relative = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    relative = `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  } else {
    relative = "Just now";
  }

  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()} (${relative})`;
}

/**
 * Get directory information including item count and breakdown
 */
export function getDirectoryInfo(filePath: string): { count: string; breakdown: string } {
  try {
    const items = readdirSync(filePath);
    const dirs = items.filter((item) => {
      try {
        return statSync(`${filePath}/${item}`).isDirectory();
      } catch {
        return false;
      }
    });
    const files = items.length - dirs.length;

    const breakdown = [];
    if (dirs.length > 0) breakdown.push(`${dirs.length} folder${dirs.length !== 1 ? "s" : ""}`);
    if (files > 0) breakdown.push(`${files} file${files !== 1 ? "s" : ""}`);

    return {
      count: `${items.length} item${items.length !== 1 ? "s" : ""}`,
      breakdown: breakdown.join(", "),
    };
  } catch {
    return { count: "Unable to read", breakdown: "" };
  }
}

/**
 * Get file type description based on extension
 */
export function getFileType(filePath: string, isDirectory: boolean): string {
  // Handle macOS app bundles first
  if (isDirectory && filePath.toLowerCase().endsWith(".app")) {
    return "Application";
  }

  if (isDirectory) return "Directory";

  const extension = extname(filePath).toLowerCase();
  if (!extension) return "File";

  const typeMap: { [key: string]: string } = {
    ".txt": "Text Document",
    ".md": "Markdown Document",
    ".js": "JavaScript File",
    ".ts": "TypeScript File",
    ".jsx": "React Component",
    ".tsx": "React TypeScript Component",
    ".json": "JSON Data",
    ".html": "HTML Document",
    ".css": "Stylesheet",
    ".scss": "Sass Stylesheet",
    ".py": "Python Script",
    ".java": "Java Source",
    ".cpp": "C++ Source",
    ".c": "C Source",
    ".h": "Header File",
    ".pdf": "PDF Document",
    ".png": "PNG Image",
    ".jpg": "JPEG Image",
    ".jpeg": "JPEG Image",
    ".gif": "GIF Image",
    ".svg": "SVG Vector",
    ".mp4": "MP4 Video",
    ".mov": "QuickTime Video",
    ".mp3": "MP3 Audio",
    ".wav": "WAV Audio",
    ".zip": "ZIP Archive",
    ".tar": "TAR Archive",
    ".gz": "Gzip Archive",
    ".csv": "CSV Spreadsheet",
    ".pages": "Pages Document",
    ".numbers": "Numbers Spreadsheet",
    ".keynote": "Keynote Presentation",
  };

  return typeMap[extension] || `${extension.toUpperCase().slice(1)} File`;
} /**
 * Get preview content for a file based on its type and extension
 */
export function getPreviewContent(filePath: string, extension: string, isDirectory: boolean): string | null {
  if (isDirectory) return null;

  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico"];
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];
  const textExtensions = [
    ".txt",
    ".md",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".json",
    ".html",
    ".css",
    ".scss",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".h",
    ".xml",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".csv",
  ];

  try {
    // Image preview
    if (imageExtensions.includes(extension)) {
      try {
        const stats = statSync(filePath);
        // Only preview images smaller than 5MB to avoid performance issues
        if (stats.size > 5 * 1024 * 1024) {
          return `**Image too large to preview** (${formatSize(stats.size)})\n\nThis image is too large to display inline. Use "Open" to view it in your default application.`;
        }

        const imageBuffer = readFileSync(filePath);
        const base64Image = imageBuffer.toString("base64");
        const mimeType = getMimeType(extension);
        return `![Preview](data:${mimeType};base64,${base64Image})`;
      } catch (error) {
        return `**Image Preview Error**\n\nCould not load image: ${error}`;
      }
    }

    // Video preview (Raycast supports video in markdown)
    if (videoExtensions.includes(extension)) {
      return `<video controls width="100%" style="max-height: 400px;">
  <source src="file://${filePath}" type="video/${extension.slice(1)}">
  Your browser does not support the video tag.
</video>`;
    }

    // CSV file preview with table formatting
    if (extension === ".csv") {
      const stats = statSync(filePath);
      // Only preview CSV files smaller than 100KB to avoid performance issues
      if (stats.size > 100 * 1024) {
        return `**CSV file too large to preview** (${formatSize(stats.size)})\n\nThis CSV file is too large to display inline. Use "Open" to view it in your default application.`;
      }

      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      if (lines.length === 0) {
        return `**Empty CSV File**\n\nThis CSV file appears to be empty.`;
      }

      // Limit preview to first 20 rows to keep it manageable
      const previewLines = lines.slice(0, 20);
      const truncated = lines.length > 20;

      try {
        // Parse CSV and create markdown table
        const rows = previewLines.map((line) => {
          // Simple CSV parsing - handles basic cases
          return line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
        });

        if (rows.length === 0) return null;

        // Create markdown table
        let table = "";

        // Header row
        const headers = rows[0];
        table += "| " + headers.join(" | ") + " |\n";
        table += "| " + headers.map(() => "---").join(" | ") + " |\n";

        // Data rows
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Pad row to match header length
          while (row.length < headers.length) row.push("");
          table += "| " + row.slice(0, headers.length).join(" | ") + " |\n";
        }

        let preview = `**CSV Preview** (${lines.length} rows)\n\n${table}`;

        if (truncated) {
          preview += `\n*... and ${lines.length - 20} more rows*`;
        }

        return preview;
      } catch (error) {
        // Fallback to plain text if CSV parsing fails
        const language = getLanguageFromExtension(extension);
        let preview = `\`\`\`${language}\n${previewLines.join("\n")}\n\`\`\``;

        console.error(error);
        if (truncated) {
          preview += `\n\n*... and ${lines.length - 20} more lines*`;
        }

        return preview;
      }
    }

    // Text file preview
    if (textExtensions.includes(extension)) {
      const stats = statSync(filePath);
      // Only preview files smaller than 100KB to avoid performance issues
      if (stats.size > 100 * 1024) {
        return `**File too large to preview** (${formatSize(stats.size)})\n\nThis file is too large to display inline. Use "Open" to view it in your default application.`;
      }

      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      // Limit preview to first 50 lines
      const previewLines = lines.slice(0, 50);
      const truncated = lines.length > 50;

      let preview = "";
      if (extension === ".md") {
        preview = previewLines.join("\n");
      } else {
        // For code files, wrap in code block with language detection
        const language = getLanguageFromExtension(extension);
        preview = `\`\`\`${language}\n${previewLines.join("\n")}\n\`\`\``;
      }

      if (truncated) {
        preview += `\n\n*... and ${lines.length - 50} more lines*`;
      }

      return preview;
    }

    // PDF preview
    if (extension === ".pdf") {
      try {
        const stats = statSync(filePath);

        // Only try to preview PDFs smaller than 10MB
        if (stats.size > 10 * 1024 * 1024) {
          return `**PDF too large to preview** (${formatSize(stats.size)})\n\nThis PDF is too large to display inline. Use "Open" to view it in your default application.`;
        }

        // Use the same approach that works for images but for PDFs
        // Raycast should handle PDF files natively with file:// protocol
        const fileUrl = `file://${filePath.replace(/ /g, "%20")}`;
        return `![PDF Preview](${fileUrl})`;
      } catch (error) {
        return `**PDF Preview Error**\n\nCould not load PDF: ${error}`;
      }
    }

    // Apple iWork files
    if ([".pages", ".numbers", ".keynote"].includes(extension)) {
      const appNames = {
        ".pages": "Pages",
        ".numbers": "Numbers",
        ".keynote": "Keynote",
      };
      const appName = appNames[extension as keyof typeof appNames];
      return `**${appName} Document**\n\nThis ${appName} document cannot be previewed inline. Use "Open" to view it in ${appName} or export it to a compatible format.`;
    }

    // Other document types that can't be previewed
    if ([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].includes(extension)) {
      return `**${extension.toUpperCase().slice(1)} Document**\n\nThis document cannot be previewed inline. Use "Open" to view it in your default application.`;
    }

    // Archive files
    if ([".zip", ".tar", ".gz", ".rar", ".7z"].includes(extension)) {
      return `**Archive File**\n\nThis archive cannot be previewed inline. Use "Open" to extract or view its contents.`;
    }
  } catch (error) {
    return `**Preview Error**\n\nCould not generate preview: ${error}`;
  }

  // For files that can't be previewed, show a large file icon
  return `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center;">
  <div style="font-size: 120px; margin-bottom: 20px;">📄</div>
  <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${getFileType(filePath, false)}</div>
  <div style="font-size: 14px; color: #666;">Cannot preview this file type</div>
</div>`;
}

/**
 * Get MIME type for image extensions
 */
export function getMimeType(extension: string): string {
  const mimeMap: { [key: string]: string } = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
  };
  return mimeMap[extension] || "image/png";
}

/**
 * Get programming language identifier from file extension for syntax highlighting
 */
export function getLanguageFromExtension(extension: string): string {
  const langMap: { [key: string]: string } = {
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "jsx",
    ".tsx": "tsx",
    ".py": "python",
    ".java": "java",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".json": "json",
    ".xml": "xml",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".ini": "ini",
    ".cfg": "ini",
    ".conf": "ini",
  };
  return langMap[extension] || "text";
}

/**
 * Extract compact date from formatted date string (just the relative time part)
 */
export function getCompactDate(dateString: string): string {
  // Extract just the relative time part from the full date string
  // formatDate returns: "12/25/2023 at 3:45:30 PM (2 days ago)"
  const match = dateString.match(/\(([^)]+)\)$/);
  if (match) {
    return match[1]; // Just return "2 days ago"
  }
  // Fallback to short date if no relative time found
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

/**
 * Get detailed file information including metadata
 */
export function getFileDetails(filePath: string) {
  try {
    const stats = statSync(filePath);
    const isDirectory = stats.isDirectory();
    const fileName = basename(filePath);

    // Get file extension
    const extension = isDirectory ? "" : extname(filePath).toLowerCase();

    const directoryInfo = isDirectory ? getDirectoryInfo(filePath) : null;

    return {
      fileName,
      isDirectory,
      extension,
      fileType: getFileType(filePath, isDirectory),
      size: isDirectory ? directoryInfo!.count : formatSize(stats.size),
      directoryBreakdown: directoryInfo?.breakdown || "",
      created: formatDate(stats.birthtime),
      modified: formatDate(stats.mtime),
      accessed: formatDate(stats.atime),
      permissions: stats.mode.toString(8),
      parentDir: dirname(filePath),
    };
  } catch (error) {
    return {
      fileName: basename(filePath),
      isDirectory: false,
      extension: "",
      fileType: "Unknown",
      size: "Unknown",
      directoryBreakdown: "",
      created: "Unknown",
      modified: "Unknown",
      accessed: "Unknown",
      permissions: "Unknown",
      parentDir: dirname(filePath),
      error: String(error),
    };
  }
}
