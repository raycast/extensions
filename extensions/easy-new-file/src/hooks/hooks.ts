import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "../types/file-type";
import { useCallback, useEffect, useState } from "react";
import fse from "fs-extra";
import path from "path";
import { Alert, confirmAlert, Icon } from "@raycast/api";
import { templateFolderPath } from "../utils/constants";

//new file here
export const getTemplateFile = (refresh: number) => {
  const [templateFiles, setTemplateFiles] = useState<TemplateType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const _templateFiles: TemplateType[] = [];
    try {
      fse.ensureDirSync(templateFolderPath);
      fse.readdirSync(templateFolderPath).forEach((file) => {
        if (!file.startsWith(".")) {
          const filePath = templateFolderPath + "/" + file;
          const parsedPath = path.parse(filePath);
          _templateFiles.push({
            path: filePath,
            name: parsedPath.name,
            extension: parsedPath.ext.substring(1),
            inputContent: false,
          });
        }
      });
      setTemplateFiles(_templateFiles);
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      console.error(String(e));
    }
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
        setIsSimpleContent(templateFiles[newFileType.index].inputContent);
        break;
      }
      case "Document": {
        setFileExtension(documentFileTypes[newFileType.index].extension);
        setIsSimpleContent(documentFileTypes[newFileType.index].inputContent);
        break;
      }
      case "Code": {
        setFileExtension(codeFileTypes[newFileType.index].extension);
        setIsSimpleContent(codeFileTypes[newFileType.index].inputContent);
        break;
      }
      case "Script": {
        setFileExtension(scriptFileTypes[newFileType.index].extension);
        setIsSimpleContent(scriptFileTypes[newFileType.index].inputContent);
        break;
      }
      default: {
        setFileExtension(documentFileTypes[0].extension);
        setIsSimpleContent(documentFileTypes[0].inputContent);
        break;
      }
    }
  }, [newFileType, templateFiles]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { isSimpleContent: isSimpleContent, fileExtension: fileExtension };
};

export const alertDialog = async (
  icon: Icon,
  title: string,
  message: string,
  confirmTitle: string,
  confirmAction: () => void,
  cancelAction?: () => void
) => {
  const options: Alert.Options = {
    icon: icon,
    title: title,
    message: message,
    primaryAction: {
      title: confirmTitle,
      onAction: confirmAction,
    },
    dismissAction: {
      title: "Cancel",
      onAction: () => cancelAction,
    },
  };
  await confirmAlert(options);
};
