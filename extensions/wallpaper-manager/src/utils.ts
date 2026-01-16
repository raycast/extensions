import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

export interface ImageFile {
  name: string;
  fullPath: string;
  folder: string;
}

export const VALID_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export async function setWallpaper(
  fullPath: string,
  options: { silent?: boolean } = {},
): Promise<boolean> {
  const psScript = `
    $imagePath = '${fullPath.replace(/'/g, "''")}'
    Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name Wallpaper -Value $imagePath
    Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name WallpaperStyle -Value '10'
    Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name TileWallpaper -Value '0'
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
    [Wallpaper]::SystemParametersInfo(0x0014, 0, $imagePath, 0x01 -bor 0x02)
  `;

  const encodedCommand = Buffer.from(psScript, "utf16le").toString("base64");
  const command = `powershell -EncodedCommand ${encodedCommand}`;

  if (!options.silent) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Setting Wallpaper...",
    });
  }

  return new Promise<boolean>((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        if (!options.silent) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to set wallpaper",
            message: stderr || error.message,
          });
        }
        resolve(false);
        return;
      }
      if (!options.silent) {
        showToast({
          style: Toast.Style.Success,
          title: "Wallpaper set!",
        });
      }
      resolve(true);
    });
  });
}

// Optimized recursive scanner
export async function scanDirectory(
  dir: string,
  relativePath: string = "",
): Promise<{ files: ImageFile[]; folders: Set<string> }> {
  const imageFiles: ImageFile[] = [];
  const foundFolders = new Set<string>();

  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "Screenshots" || entry.name.startsWith("."))
          continue;

        const folderPath = relativePath
          ? `${relativePath}/${entry.name}`
          : entry.name;
        foundFolders.add(folderPath);

        const subResults = await scanDirectory(fullPath, folderPath);
        subResults.files.forEach((f) => imageFiles.push(f));
        subResults.folders.forEach((f) => foundFolders.add(f));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VALID_EXTENSIONS.includes(ext)) {
          imageFiles.push({
            name: entry.name,
            fullPath: fullPath,
            folder: relativePath || "__root__",
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error);
  }

  return { files: imageFiles, folders: foundFolders };
}
