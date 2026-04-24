import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function setWindowsWallpaper(pathOrUrl: string): Promise<void> {
  let finalPath = pathOrUrl;

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `raycast_wallpaper_${Date.now()}.jpg`;
    finalPath = path.join(os.tmpdir(), fileName);
    await fs.writeFile(finalPath, buffer);
  }

  // Ensure absolute path
  const absolutePath = path.resolve(finalPath);

  // Create a powershell script safely
  const safePath = absolutePath.replace(/'/g, "''");
  const scriptContent = `
$path = '${safePath}'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
[Wallpaper]::SystemParametersInfo(20, 0, $path, 3)
`;

  const scriptPath = path.join(os.tmpdir(), "set_wallpaper.ps1");
  await fs.writeFile(scriptPath, scriptContent, "utf-8");

  await execAsync(
    `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`,
  );
}
