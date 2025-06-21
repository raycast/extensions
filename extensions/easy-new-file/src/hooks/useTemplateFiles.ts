import { useCachedPromise } from "@raycast/utils";
import fse from "fs-extra";
import { templateFolderPath } from "../utils/constants";
import path from "path";
import { TemplateType } from "../types/file-type";

async function getTemplateFiles() {
  const _templateFiles: TemplateType[] = [];
  try {
    await fse.ensureDir(templateFolderPath);
    const files = await fse.readdir(templateFolderPath);
    files.forEach((file) => {
      const filePath = templateFolderPath + "/" + file;
      const parsedPath = path.parse(filePath);
      let ext: string = parsedPath.ext.substring(1);
      if (parsedPath.name.startsWith(".")) {
        ext = parsedPath.name.split(".").length > 1 ? parsedPath.name.split(".")[1] : "";
      }
      _templateFiles.push({
        path: filePath,
        name: parsedPath.name,
        extension: ext,
        inputContent: false,
      });
    });
  } catch (e) {
    console.error(String(e));
  }
  return _templateFiles;
}

export const useTemplateFiles = () => {
  return useCachedPromise(
    () => async () => {
      return { data: await getTemplateFiles() };
    },
    [],
  );
};
