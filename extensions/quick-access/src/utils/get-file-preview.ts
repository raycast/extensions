import fse, { existsSync, PathLike } from "fs-extra";
import { FileInfo } from "./directory-info";
import { tmpdir } from "os";
import { APP_EXT, DMG_EXT, imgExt, NO_PREVIEW_EXTENSIONS, ZIP_EXT } from "./constants";
import { parse } from "path";
import { exec } from "child_process";
import * as util from "util";
import fileUrl from "file-url";
import { formatBytes, isEmpty } from "./common-utils";
import { environment } from "@raycast/api";

const assetPath = environment.assetsPath;

//Detail content: Image
export const getFileContent = async (fileInfo: FileInfo) => {
  let detailContent = "";
  let preview = "";
  let size = "";
  const parsePath = parse(fileInfo.path);
  try {
    if (!isEmpty(fileInfo.path)) {
      const fileStat = fse.statSync(fileInfo.path);
      if (parsePath.ext === APP_EXT) {
        preview = `<img src="${fileUrl(environment.assetsPath + "/AppIcon.icns")}" alt="${
          fileInfo.name
        }" height="180" />\n`;
      } else if (fileStat.isDirectory()) {
        const files = fse.readdirSync(fileInfo.path);
        const isNormalFile = files.filter((value) => !value.startsWith("."));
        preview = `<img src="${fileUrl(assetPath + "/folder-icon.png")}" alt="${fileInfo.name}" height="180" />\n`;
        size = `**Sub-files**: ${isNormalFile.length}`;
      } else {
        if (imgExt.includes(parsePath.ext)) {
          preview = `<img src="${fileUrl(fileInfo.path)}" alt="${fileInfo.name}" height="180" />\n`;
        } else if (ZIP_EXT.includes(parsePath.ext)) {
          preview = `<img src="${fileUrl(environment.assetsPath + "/ArchiveUtility.icns")}" alt="${
            fileInfo.name
          }" height="180" />\n`;
        } else if (parsePath.ext === DMG_EXT) {
          preview = `<img src="${fileUrl(environment.assetsPath + "/DmgIcon.icns")}" alt="${
            fileInfo.name
          }" height="180" />\n`;
        } else if (NO_PREVIEW_EXTENSIONS.includes(parsePath.ext)) {
          preview = `<img src="${fileUrl(assetPath + "/" + "file-icon.png")}" alt="${fileInfo.name}" height="180" />\n`;
        } else {
          const previewPath = await fileMetadataMarkdown(fileInfo);
          if (isEmpty(previewPath)) {
            preview = `<img src="${fileUrl(assetPath + "/" + "file-icon.png")}" alt="${
              fileInfo.name
            }" height="180" />\n`;
          } else {
            preview = `<img src="${previewPath}" alt="${fileInfo.name}"height="180"  />\n`;
          }
        }
        size = `**Size**: ${formatBytes(fileStat.size)}`;
      }

      detailContent = `${preview}
      
------

**Name**: ${parsePath.base}

**Where**: ${parsePath.dir}

${size}

**Created**: ${new Date(fileStat.birthtime).toLocaleString()}

**Modified**: ${new Date(fileStat.mtime).toLocaleString()}

**Last opened**: ${new Date(fileStat.atime).toLocaleString()}
`;
    }
  } catch (e) {
    console.error(String(e));
  }
  return detailContent;
};

export const fileMetadataMarkdown = async (file: FileInfo | null): Promise<string> => {
  if (!file) {
    return "";
  }

  const previewPath = await filePreviewPath(file);
  const previewExists = previewPath && existsSync(decodeURI(previewPath).replace("file://", ""));
  return previewExists ? previewPath : "";
};

const escapePath = (path: PathLike): string => path.toLocaleString().replace(/([^0-9a-z_\-.~/])/gi, "\\$1");
const execAsync = util.promisify(exec);
const filePreviewPath = async (file: FileInfo): Promise<null | string> => {
  const outputDir = tmpdir() + "/quick-access-preview";
  if (!fse.pathExistsSync(outputDir)) {
    fse.mkdirSync(outputDir, { recursive: true });
  }

  try {
    await execAsync(`qlmanage -t -s 256 ${escapePath(file.path)} -o ${outputDir}`, {
      timeout: 500 /* milliseconds */,
      killSignal: "SIGKILL",
    });
  } catch (e) {
    return null;
  }
  return encodeURI(`file://${outputDir}/${file.name}.png`);
};
