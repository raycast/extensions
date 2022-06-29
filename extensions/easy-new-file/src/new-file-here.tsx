import fse from "fs-extra";
import * as XLSX from "xlsx";
import { getPreferenceValues, open, showHUD, showInFinder } from "@raycast/api";
import React, { useState } from "react";
import { isEmpty } from "./utils/common-utils";
import { FileType, TemplateType } from "./types/file-type";
import { getTemplateFile } from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { NewFileHereListLayout } from "./components/new-file-here-list-layout";
import { NewFileHereGridLayout } from "./components/new-file-here-grid-layout";

export default function NewFileHere() {
  const { layout } = getPreferenceValues<Preferences>();
  const [refresh, setRefresh] = useState<number>(0);

  //hooks
  const { templateFiles, isLoading } = getTemplateFile(refresh);

  return layout === "List" ? (
    <NewFileHereListLayout isLoading={isLoading} templateFiles={templateFiles} setRefresh={setRefresh} />
  ) : (
    <NewFileHereGridLayout isLoading={isLoading} templateFiles={templateFiles} setRefresh={setRefresh} />
  );
}

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fse.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + " " + index + "." + extension;
      const directoryExists = fse.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + "-" + index + "." + extension;
  }
}

export async function createNewFile(fileType: FileType, desPath: string, fileName = "", fileContent = "") {
  isEmpty(fileName)
    ? (fileName = buildFileName(desPath, fileType.name, fileType.extension))
    : (fileName = fileName + "." + fileType.extension);
  const filePath = desPath + fileName;
  if (fileType.name === "Excel") {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, filePath);
  } else {
    fse.writeFileSync(filePath, fileContent);
  }

  await showCreateSuccess(fileName, filePath, desPath);
}

export async function createNewFileByTemplate(template: TemplateType, desPath: string, fileName = "") {
  isEmpty(fileName)
    ? (fileName = buildFileName(desPath, template.name, template.extension))
    : (fileName = fileName + "." + template.extension);
  const filePath = desPath + fileName;
  fse.copyFileSync(template.path, filePath);
  await showCreateSuccess(fileName, filePath, desPath);
}

export const showCreateSuccess = async (fileName: string, filePath: string, folderPath: string) => {
  switch (getPreferenceValues<Preferences>().createdActions) {
    case "no": {
      break;
    }
    case "open": {
      await open(filePath);
      break;
    }
    case "show": {
      await showInFinder(filePath);
    }
  }
  await showHUD(`${fileName} created in ${folderPath.slice(0, -1)}`);
};
