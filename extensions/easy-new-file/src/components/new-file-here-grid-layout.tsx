import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "../types/file-type";
import React from "react";
import { getPreferenceValues, Grid } from "@raycast/api";
import { isEmpty, isImage } from "../utils/common-utils";
import { parse } from "path";
import { ActionNewTemplateFileHere } from "./action-new-template-file-here";
import { Preferences } from "../types/preferences";
import { NewFileHereEmptyView } from "./new-file-here-empty-view";
import { NewFileHereItem } from "./new-file-here-item";

export function NewFileHereGridLayout(props: {
  isLoading: boolean;
  templateFiles: TemplateType[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { isLoading, templateFiles, setRefresh } = props;
  const { layout, itemSize, itemInset, showDocument, showCode, showScript } = getPreferenceValues<Preferences>();
  return (
    <Grid
      inset={isEmpty(itemInset) ? undefined : (itemInset as Grid.Inset)}
      itemSize={itemSize as Grid.ItemSize}
      isLoading={isLoading}
      searchBarPlaceholder={"Search and create files"}
      selectedItemId={templateFiles.length > 0 ? templateFiles[0].path : ""}
    >
      <NewFileHereEmptyView
        layout={layout}
        title={"No templates"}
        description={"You can add template from the Action Panel"}
        setRefresh={setRefresh}
      />
      <Grid.Section title={"Template"} subtitle={templateFiles.length + ""}>
        {templateFiles.map((template, index) => {
          return (
            <Grid.Item
              id={template.path}
              key={template.path}
              keywords={[template.extension]}
              content={{
                value: isImage(parse(template.path).ext) ? { source: template.path } : { fileIcon: template.path },
                tooltip: template.name + "." + template.extension,
              }}
              title={template.name}
              quickLook={{ path: template.path, name: template.name }}
              actions={
                <ActionNewTemplateFileHere
                  template={template}
                  index={index}
                  templateFiles={templateFiles}
                  setRefresh={setRefresh}
                />
              }
            />
          );
        })}
      </Grid.Section>
      {!isLoading && showDocument && (
        <Grid.Section title={"Document"} subtitle={documentFileTypes.length + ""}>
          {documentFileTypes.map((fileType, index) => {
            return (
              <NewFileHereItem
                key={fileType.languageId}
                layout={layout}
                fileType={fileType}
                newFileType={{ section: "Document", index: index }}
                templateFiles={templateFiles}
                setRefresh={setRefresh}
              />
            );
          })}
        </Grid.Section>
      )}
      {!isLoading && showCode && (
        <Grid.Section title={"Code"} subtitle={codeFileTypes.length + ""}>
          {codeFileTypes.map((fileType, index) => {
            return (
              <NewFileHereItem
                key={fileType.languageId}
                layout={layout}
                fileType={fileType}
                newFileType={{ section: "Code", index: index }}
                templateFiles={templateFiles}
                setRefresh={setRefresh}
              />
            );
          })}
        </Grid.Section>
      )}
      {!isLoading && showScript && (
        <Grid.Section title={"Script"} subtitle={scriptFileTypes.length + ""}>
          {scriptFileTypes.map((fileType, index) => {
            return (
              <NewFileHereItem
                key={fileType.languageId}
                layout={layout}
                fileType={fileType}
                newFileType={{ section: "Script", index: index }}
                templateFiles={templateFiles}
                setRefresh={setRefresh}
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
