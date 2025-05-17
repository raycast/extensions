import { Clipboard } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { existsSync } from "fs";
import os from "os";

function toSvg(path: string, width: number, height: number, color: string): string {
  //  replace all currentColor pattern with the provided color
  path = path.replace(/currentColor/g, color);

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}

function toDataURI(svg: string): string {
  return `data:image/svg+xml,${svg}`;
}

function toURL(setId: string, id: string): string {
  return `https://api.iconify.design/${setId}/${id}.svg`;
}

async function copyToClipboard(svgString: string, id: string) {
  const osTempDirectory = os.tmpdir();
  const fileTempDirectory = `${osTempDirectory}/raycast-iconify`;

  if (!existsSync(fileTempDirectory)) {
    await runAppleScript(`
        set file_path to "${fileTempDirectory}"
        set file_path to do shell script "echo " & quoted form of file_path & " | iconv -f utf-8 -t utf-8"
        set file_path to file_path as text

        do shell script "mkdir -p " & quoted form of file_path
      `);
  }
  const selectedPath = fileTempDirectory;
  const fixedPathName = selectedPath.endsWith("/") ? `${selectedPath}${id}.svg` : `${selectedPath}/${id}.svg`;

  const actualPath = fixedPathName;

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

  await Clipboard.copy({
    file: actualPath,
  });
}

export { toSvg, toDataURI, toURL, copyToClipboard };
