import fse from "fs-extra";
import * as XLSX from "xlsx";
import { open, showInFinder } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { getFinderPath, isEmpty, showCustomHUD } from "./utils/common-utils";
import { FileType, TemplateType } from "./types/file-type";
import { NewFileHereListLayout } from "./components/new-file-here-list-layout";
import { NewFileHereGridLayout } from "./components/new-file-here-grid-layout";
import { rtfPreContent } from "./utils/constants";
import { createdAction, layout } from "./types/preferences";
import NewFileWithDetails from "./new-file-with-details";
import { useTemplateFiles } from "./hooks/useTemplateFiles";
import { parse } from "path";

export default function NewFileWithTemplate() {
  const navigationTitle = "New File with Template";

  const { data, isLoading, mutate } = useTemplateFiles();
  const [folder, setFolder] = useState<string>("");

  const templateFiles = useMemo(() => {
    return data || [];
  }, [data]);

  const section = useMemo(() => {
    return data?.length > 0 ? "Template" : "Document";
  }, [data]);

  useEffect(() => {
    const getFolderName = async () => {
      const finderPath = await getFinderPath();
      const parsedPath = parse(finderPath);
      setFolder(parsedPath.name);
    };
    getFolderName().then();
  }, [data]);

  switch (layout) {
    case "List":
      return (
        <NewFileHereListLayout
          navigationTitle={navigationTitle}
          isLoading={isLoading}
          templateFiles={templateFiles}
          folder={folder}
          mutate={mutate}
        />
      );
    case "Form":
      return (
        <NewFileWithDetails
          newFileType={{ section: section, index: 0 }}
          templateFiles={templateFiles}
          folder={folder}
          isLoading={isLoading}
          navigationTitle={navigationTitle}
        />
      );
    default:
      return (
        <NewFileHereGridLayout
          navigationTitle={navigationTitle}
          isLoading={isLoading}
          templateFiles={templateFiles}
          folder={folder}
          mutate={mutate}
        />
      );
  }
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
  fileName = isEmpty(fileName)
    ? buildFileName(desPath, fileType.name, fileType.extension)
    : fileName + "." + fileType.extension;
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

export async function createNewFileByTemplate(template: TemplateType, desPath: string, customFileName = "") {
  if (isEmpty(customFileName)) {
    if (template.name.startsWith(".")) {
      customFileName = template.name;
    } else {
      customFileName = buildFileName(desPath, template.name, template.extension);
    }
  } else {
    if (template.name.startsWith(".")) {
      const ext = template.name.split(".").length > 1 ? template.name.split(".")[1] : "";
      customFileName = customFileName + "." + ext;
    } else {
      customFileName = customFileName + "." + template.extension;
    }
  }

  const filePath = desPath + customFileName;
  fse.copyFileSync(template.path, filePath);
  await showCreateSuccess(customFileName, filePath, desPath);
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
