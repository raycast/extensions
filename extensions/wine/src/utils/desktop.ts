import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface DesktopFileData {
  name?: string;
  exec?: string;
  icon?: string;
  path?: string;
  comment?: string;
}

/**
 * Parse .desktop file content into structured data
 */
export function parseDesktopFileContent(content: string): DesktopFileData {
  const data: DesktopFileData = {};
  const lines = content.split("\n").slice(0, 200); // Limit parsing to first 200 lines for performance

  for (const line of lines) {
    if (line.startsWith("Name=") && !data.name) {
      data.name = line.substring(5).trim();
    } else if (line.startsWith("Exec=") && !data.exec) {
      data.exec = line.substring(5).trim();
    } else if (line.startsWith("Icon=") && !data.icon) {
      data.icon = line.substring(5).trim();
    } else if (line.startsWith("Path=") && !data.path) {
      data.path = line.substring(5).trim();
    } else if (line.startsWith("Comment=") && !data.comment) {
      data.comment = line.substring(8).trim();
    }
  }

  return data;
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve an icon name or path to an actual file path
 */
export async function resolveIconPath(iconValue: string | undefined): Promise<string | undefined> {
  if (!iconValue) return undefined;

  // If it's an absolute path to an image, return it directly
  if (path.isAbsolute(iconValue) && (await isValidImagePath(iconValue))) {
    return iconValue;
  }

  // Otherwise, search in standard icon directories
  return await findIconInStandardLocations(iconValue);
}

/**
 * Check if a path points to a valid image file
 */
async function isValidImagePath(filePath: string): Promise<boolean> {
  return /\.(png|svg|jpg|jpeg)$/i.test(filePath) && (await fileExists(filePath));
}

/**
 * Find an icon in standard theme directories
 */
async function findIconInStandardLocations(iconName: string): Promise<string | undefined> {
  const homeDir = os.homedir();
  const commonIconPaths = [
    path.join(homeDir, ".local", "share", "icons"),
    "/usr/share/icons",
    "/usr/local/share/icons",
    "/opt/local/share/icons",
    "/usr/share/pixmaps",
  ];

  const sizes = ["scalable", "256x256", "128x128", "64x64", "48x48", "32x32"];
  const extensions = [".svg", ".png"];

  // First check pixmaps directories (flat structure)
  for (const basePath of commonIconPaths) {
    if (!(await fileExists(basePath))) continue;

    if (basePath.endsWith("pixmaps")) {
      const iconPath = await findIconInPixmaps(basePath, iconName, extensions);
      if (iconPath) return iconPath;
    }

    // Then check themed directories
    const iconPath = await findIconInThemedDirs(basePath, iconName, sizes, extensions);
    if (iconPath) return iconPath;
  }

  return undefined;
}

/**
 * Find an icon in pixmaps directories (flat structure)
 */
async function findIconInPixmaps(
  basePath: string,
  iconName: string,
  extensions: string[],
): Promise<string | undefined> {
  for (const ext of extensions) {
    const directPath = path.join(basePath, iconName + ext);
    if (await fileExists(directPath)) return directPath;
  }
  return undefined;
}

/**
 * Find an icon in themed directories structure
 */
async function findIconInThemedDirs(
  basePath: string,
  iconName: string,
  sizes: string[],
  extensions: string[],
): Promise<string | undefined> {
  // Get available theme directories
  const themesToCheck = ["hicolor"]; // Default fallback theme
  try {
    const subDirs = await fs.promises.readdir(basePath, { withFileTypes: true });
    subDirs.forEach((subDir) => {
      if (subDir.isDirectory() && !themesToCheck.includes(subDir.name)) {
        themesToCheck.push(subDir.name);
      }
    });
  } catch {
    /* ignore errors reading theme dirs */
  }

  // Search through themes and sizes
  for (const theme of themesToCheck) {
    for (const size of sizes) {
      // Check apps directory
      const appsDir = path.join(basePath, theme, size, "apps");
      if (await fileExists(appsDir)) {
        for (const ext of extensions) {
          // Check with extension
          const fullPath = path.join(appsDir, iconName + ext);
          if (await fileExists(fullPath)) return fullPath;

          // Check without extension
          const fullPathNoExt = path.join(appsDir, iconName);
          if (await fileExists(fullPathNoExt)) return fullPathNoExt;
        }
      }

      // Check size directory directly
      const sizeDir = path.join(basePath, theme, size);
      if (await fileExists(sizeDir)) {
        for (const ext of extensions) {
          const fullPath = path.join(sizeDir, iconName + ext);
          if (await fileExists(fullPath)) return fullPath;
        }
      }
    }
  }

  return undefined;
}
