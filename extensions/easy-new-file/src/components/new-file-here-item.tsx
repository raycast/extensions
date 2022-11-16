import { FileType, TemplateType } from "../types/file-type";
import React from "react";
import { Grid, List } from "@raycast/api";
import { ActionNewFileHere } from "./action-new-file-here";

export function NewFileHereItem(props: {
  layout: string;
  fileType: FileType;
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { layout, fileType, newFileType, templateFiles, setRefresh } = props;
  return layout === "List" ? (
    <List.Item
      keywords={fileType.keywords}
      icon={{ source: fileType.icon }}
      title={{ value: fileType.name, tooltip: fileType.name + "." + fileType.extension }}
      actions={
        <ActionNewFileHere
          fileType={fileType}
          newFileType={newFileType}
          templateFiles={templateFiles}
          setRefresh={setRefresh}
        />
      }
    />
  ) : (
    <Grid.Item
      keywords={fileType.keywords}
      content={{ value: fileType.icon, tooltip: fileType.name + "." + fileType.extension }}
      title={fileType.name}
      actions={
        <ActionNewFileHere
          fileType={fileType}
          newFileType={newFileType}
          templateFiles={templateFiles}
          setRefresh={setRefresh}
        />
      }
    />
  );
}
