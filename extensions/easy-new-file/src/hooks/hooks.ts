import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "../utils/file-type";
import { useCallback, useEffect, useState } from "react";
import fse from "fs-extra";
import path from "path";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
};

//new file here
export const getTemplateFile = (templateFolderPath: string, refresh: number) => {
  const [templateFiles, setTemplateFiles] = useState<TemplateType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const _templateFiles: TemplateType[] = [];
    try {
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
    } catch (e) {
      console.error(String(e));
      fse.mkdirSync(templateFolderPath);
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
