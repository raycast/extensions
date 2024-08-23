import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "../types/file-type";
import React from "react";
import { List } from "@raycast/api";
import { NewFileHereEmptyView } from "./new-file-here-empty-view";
import { getDetail, isImage } from "../utils/common-utils";
import { parse } from "path";
import { ActionNewTemplateFileHere } from "./action-new-template-file-here";
import { NewFileHereItem } from "./new-file-here-item";
import { layout, showCode, showDocument, showScript } from "../types/preferences";

export function NewFileHereListLayout(props: {
  navigationTitle: string;
  isLoading: boolean;
  templateFiles: TemplateType[];
  folder: string;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { navigationTitle, isLoading, templateFiles, folder, setRefresh } = props;

  return (
    <List
      navigationTitle={navigationTitle}
      isShowingDetail={true}
      isLoading={isLoading}
      searchBarPlaceholder={"Search and create files"}
      selectedItemId={templateFiles.length > 0 ? templateFiles[0].path : ""}
    >
      <NewFileHereEmptyView
        layout={layout}
        title={"No Templates"}
        description={"You can add template from the Action Panel"}
        setRefresh={setRefresh}
      />
      <List.Section title={"Template"}>
        {!isLoading &&
          templateFiles.map((template, index) => {
            return (
              <List.Item
                id={template.path}
                key={template.path}
                keywords={[template.extension]}
                detail={<List.Item.Detail markdown={`${getDetail(template)}`} />}
                icon={isImage(parse(template.path).ext) ? { source: template.path } : { fileIcon: template.path }}
                title={{ value: template.name, tooltip: template.name + "." + template.extension }}
                subtitle={template.extension.toUpperCase()}
                quickLook={{ path: template.path, name: template.name }}
                actions={
                  <ActionNewTemplateFileHere
                    template={template}
                    index={index}
                    templateFiles={templateFiles}
                    folder={folder}
                    setRefresh={setRefresh}
                  />
                }
              />
            );
          })}
      </List.Section>
      {!isLoading && showDocument && (
        <List.Section title={"Document"}>
          {documentFileTypes.map((fileType, index) => {
            return (
              <NewFileHereItem
                key={fileType.languageId}
                layout={layout}
                fileType={fileType}
                newFileType={{ section: "Document", index: index }}
                templateFiles={templateFiles}
                folder={folder}
                setRefresh={setRefresh}
              />
            );
          })}
        </List.Section>
      )}
      {!isLoading && showCode && (
        <List.Section title={"Code"}>
          {codeFileTypes.map((fileType, index) => {
            return (
              <NewFileHereItem
                key={fileType.languageId}
                layout={layout}
                fileType={fileType}
                newFileType={{ section: "Code", index: index }}
                templateFiles={templateFiles}
                folder={folder}
                setRefresh={setRefresh}
              />
            );
          })}
        </List.Section>
      )}
      {!isLoading && showScript && (
        <List.Section title={"Script"}>
          {scriptFileTypes.map((fileType, index) => {
            return (
              <NewFileHereItem
                key={fileType.languageId}
                layout={layout}
                fileType={fileType}
                newFileType={{ section: "Script", index: index }}
                templateFiles={templateFiles}
                folder={folder}
                setRefresh={setRefresh}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
