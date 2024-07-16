import fse from "fs-extra";
import * as XLSX from "xlsx";
import { environment, open, showInFinder } from "@raycast/api";
import React, { useState } from "react";
import { isEmpty, showCustomHUD } from "./utils/common-utils";
import { FileType, TemplateType } from "./types/file-type";
import { getTemplateFile } from "./hooks/hooks";
import { NewFileHereListLayout } from "./components/new-file-here-list-layout";
import { NewFileHereGridLayout } from "./components/new-file-here-grid-layout";
import { rtfPreContent } from "./utils/constants";
import { createdAction, layout } from "./types/preferences";

export default function NewFileWithTemplate() {
  const [refresh, setRefresh] = useState<number>(0);
  const launchContext = environment.launchContext;
  const navigationTitle = launchContext?.navigationTitle || "New File With Template";

  //hooks
  const { folder, templateFiles, isLoading } = getTemplateFile(refresh);

  return layout === "List" ? (
    <NewFileHereListLayout
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      templateFiles={templateFiles}
      folder={folder}
      setRefresh={setRefresh}
    />
  ) : (
    <NewFileHereGridLayout
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      templateFiles={templateFiles}
      folder={folder}
      setRefresh={setRefresh}
    />
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

  switch (fileType.name) {
    case "Excel": {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, filePath);
      break;
    }
    case "RTF": {
      fse.writeFileSync(filePath, rtfPreContent);
      break;
    }
    default: {
      fse.writeFileSync(filePath, fileContent);
      break;
    }
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
  switch (createdAction) {
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
  await showCustomHUD({ title: `📄 ${fileName} created in ${folderPath.slice(0, -1)}` });
};
