import { LocalStorage } from "@raycast/api";

export interface FileCategory {
  name: string;
  extensions: string[];
}

export const DEFAULT_CATEGORIES: FileCategory[] = [
  {
    name: "★ Pictures",
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".heic", ".svg", ".ico"],
  },
  {
    name: "★ Videos",
    extensions: [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mpeg", ".3gp", ".ts"],
  },
  {
    name: "★ Audio",
    extensions: [".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".wma", ".aiff"],
  },
  {
    name: "★ Documents",
    extensions: [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".odt",
      ".ods",
      ".odp",
      ".rtf",
      ".txt",
      ".md",
      ".csv",
      ".tsv",
      ".numbers",
      ".psd",
      ".ai",
      ".xd",
      ".fig",
      ".sketch",
      ".indd",
    ],
  },
  {
    name: "★ Archives",
    extensions: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso", ".dmg"],
  },
  {
    name: "★ Code",
    extensions: [
      ".py",
      ".js",
      ".ts",
      ".tsx",
      ".jsx",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".cs",
      ".go",
      ".rb",
      ".php",
      ".swift",
      ".rs",
      ".sh",
      ".bat",
      ".sql",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
    ],
  },
  {
    name: "★ Executables",
    extensions: [".exe", ".msi", ".apk", ".app", ".bin", ".run", ".pkg", ".deb", ".rpm"],
  },
  {
    name: "★ Fonts",
    extensions: [".ttf", ".otf", ".woff", ".woff2", ".eot"],
  },
];

export async function loadCategories(): Promise<FileCategory[]> {
  try {
    const storedCategories = await LocalStorage.getItem<string>("file-categories");
    if (storedCategories) {
      return JSON.parse(storedCategories);
    } else {
      // First time setup - save and return default categories
      await saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
  } catch (error) {
    console.error("Failed to load categories:", error);
    // Fallback to default categories if storage fails
    return DEFAULT_CATEGORIES;
  }
}

export async function saveCategories(categories: FileCategory[]): Promise<void> {
  try {
    await LocalStorage.setItem("file-categories", JSON.stringify(categories));
  } catch (error) {
    console.error("Failed to save categories:", error);
    throw error;
  }
}

export function categoriesToFileTypes(categories: FileCategory[]): Record<string, string[]> {
  const fileTypes: Record<string, string[]> = {};

  for (const category of categories) {
    fileTypes[category.name] = category.extensions;
  }

  // Always include "Other" category for uncategorized files
  fileTypes["★ Other"] = [];

  return fileTypes;
}
