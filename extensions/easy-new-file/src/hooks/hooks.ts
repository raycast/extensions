//for refresh useState
import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "../utils/file-type";
import { useCallback, useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import fse from "fs-extra";
import { getFileInfo } from "../utils/common-utils";
import { showToast, Toast } from "@raycast/api";

export const refreshNumber = () => {
  return new Date().getTime();
};

export const initRunApplescript = () => {
  const fetchData = useCallback(async () => {
    await runAppleScript("");
  }, []);
  useEffect(() => {
    void fetchData();
  }, [fetchData]);
};

//new file here
export const getTemplateFile = (templateFolderPath: string, refresh: number) => {
  const [templateFiles, setTemplateFiles] = useState<TemplateType[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const _templateFiles: TemplateType[] = [];
    try {
      if (fse.existsSync(templateFolderPath)) {
        fse.readdirSync(templateFolderPath).forEach((file) => {
          if (!file.startsWith(".")) {
            const filePath = templateFolderPath + "/" + file;
            const { nameWithoutExtension, extension } = getFileInfo(filePath);
            _templateFiles.push({
              path: filePath,
              name: nameWithoutExtension,
              extension: extension,
              simpleContent: false,
            });
          }
        });
      } else {
        fse.mkdirSync(templateFolderPath);
      }
    } catch (e) {
      await showToast(Toast.Style.Failure, String(e));
    }
    setTemplateFiles(_templateFiles);
    setIsLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { templateFiles: templateFiles, isLoading: isLoading };
};

//new file with name
export const getFileType = (newFileType: { section: string; index: number }, templateFiles: TemplateType[]) => {
  const [isSimpleContent, setIsSimpleContent] = useState<boolean>(false);
  const [fileExtension, setFileExtension] = useState<string>("txt");

  const fetchData = useCallback(() => {
    switch (newFileType.section) {
      case "Template": {
        setFileExtension(templateFiles[newFileType.index].extension);
        setIsSimpleContent(templateFiles[newFileType.index].simpleContent);
        break;
      }
      case "Document": {
        setFileExtension(documentFileTypes[newFileType.index].extension);
        setIsSimpleContent(documentFileTypes[newFileType.index].simpleContent);
        break;
      }
      case "Code": {
        setFileExtension(codeFileTypes[newFileType.index].extension);
        setIsSimpleContent(codeFileTypes[newFileType.index].simpleContent);
        break;
      }
      case "Script": {
        setFileExtension(scriptFileTypes[newFileType.index].extension);
        setIsSimpleContent(scriptFileTypes[newFileType.index].simpleContent);
        break;
      }
      default: {
        setFileExtension(documentFileTypes[0].extension);
        setIsSimpleContent(documentFileTypes[0].simpleContent);
        break;
      }
    }
  }, [newFileType, templateFiles]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { isSimpleContent: isSimpleContent, fileExtension: fileExtension };
};
