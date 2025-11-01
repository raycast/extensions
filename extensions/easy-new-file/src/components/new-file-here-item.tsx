import { FileType, TemplateType } from "../types/file-type";
import React from "react";
import { environment, Grid, List } from "@raycast/api";
import { ActionNewFileHere } from "./action-new-file-here";
import fileUrl from "file-url";
import { MutatePromise } from "@raycast/utils";

export function NewFileHereItem(props: {
  layout: string;
  fileType: FileType;
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
  folder: string;
  mutate: MutatePromise<TemplateType[]>;
}) {
  const { layout, fileType, newFileType, templateFiles, folder, mutate } = props;
  return layout === "List" ? (
    <List.Item
      keywords={fileType.keywords}
      icon={{ source: fileType.icon }}
      title={{ value: fileType.name, tooltip: fileType.name + "." + fileType.extension }}
      detail={
        <List.Item.Detail
          markdown={`<img src="${fileUrl(`${environment.assetsPath}/${fileType.icon}`)}" alt="${
            fileType.name
          }" height="190" />`}
        />
      }
      actions={
        <ActionNewFileHere
          fileType={fileType}
          newFileType={newFileType}
          templateFiles={templateFiles}
          folder={folder}
          mutate={mutate}
        />
      }
    />
  ) : (
    <Grid.Item
      keywords={fileType.keywords}
      content={{ value: fileType.icon, tooltip: `${fileType.name}.${fileType.extension}` }}
      title={fileType.name}
      actions={
        <ActionNewFileHere
          fileType={fileType}
          newFileType={newFileType}
          templateFiles={templateFiles}
          folder={folder}
          mutate={mutate}
        />
      }
    />
  );
}
