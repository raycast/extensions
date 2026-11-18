import { Clipboard } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir, platform } from "node:os";
import path from "node:path";

const osPlatform = platform();
const isWindows = osPlatform === "win32";
const isMac = osPlatform === "darwin";
if (!isWindows && !isMac) {
  throw new Error("Unsupported operating system");
}

export function toSvg(path: string, width: number, height: number, color: string): string {
  //  replace all currentColor pattern with the provided color
  path = path.replace(/currentColor/g, color);

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}

export function toDataURI(svg: string): string {
  return `data:image/svg+xml,${svg}`;
}

export function toURL(setId: string, id: string): string {
  return `https://api.iconify.design/${setId}/${id}.svg`;
}

export async function copyToClipboard(svgString: string, id: string): Promise<boolean> {
  const osTempDirectory = tmpdir();
  const fileTempDirectory = path.join(osTempDirectory, "/raycast-iconify");

  if (!existsSync(fileTempDirectory)) {
    if (isWindows) {
      try {
        mkdirSync(fileTempDirectory, { recursive: true });
      } catch (e) {
        showFailureToast(e, { title: "Unable to create temporary directory" });
        return false;
      }
    } else {
      await runAppleScript(`
        set file_path to "${fileTempDirectory}"
        set file_path to do shell script "echo " & quoted form of file_path & " | iconv -f utf-8 -t utf-8"
        set file_path to file_path as text

        do shell script "mkdir -p " & quoted form of file_path
      `);
    }
  }
  const selectedPath = fileTempDirectory;
  const fixedPathName = selectedPath.endsWith("/") ? `${selectedPath}${id}.svg` : `${selectedPath}/${id}.svg`;

  const actualPath = fixedPathName;

  if (isWindows) {
    try {
      writeFileSync(actualPath, svgString, { encoding: "utf-8" });
    } catch (e) {
      showFailureToast(e, { title: "Unable to write file to disk" });
      return false;
    }
  } else {
    const fixedSvgString = svgString.replace(/"/g, '\\"');
    await runAppleScript(`
        set svg to "${fixedSvgString}"
        set svg to do shell script "echo " & quoted form of svg & " | iconv -f utf-8 -t utf-8"
        set svg to svg as text
  
        set file_path to "${actualPath}"
        set file_path to do shell script "echo " & quoted form of file_path & " | iconv -f utf-8 -t utf-8"
        set file_path to file_path as text
  
        set fileRef to open for access file_path with write permission
        write svg to fileRef
        close access fileRef
      `);
  }

  await Clipboard.copy({
    file: actualPath,
  });

  return true;
}
