import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "../types/file-type";
import { useCallback, useEffect, useState } from "react";
import { Alert, confirmAlert, Icon } from "@raycast/api";

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
  cancelAction?: () => void,
) => {
  const options: Alert.Options = {
    icon: icon,
    title: title,
    message: message,
    primaryAction: {
      title: confirmTitle,
      style: Alert.ActionStyle.Destructive,
      onAction: confirmAction,
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
      onAction: () => cancelAction,
    },
  };
  await confirmAlert(options);
};
