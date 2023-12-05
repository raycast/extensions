import { Color, List } from "@raycast/api";
import { filesize as fileSizeFormat } from "filesize";
import * as path from "path";
import { Fragment, ReactNode } from "react";
import { fileState$ } from "../managers/fileManager";
import { FileType } from "../type/file";

export function FileDetail() {
  const loading = fileState$.loading.use();
  const selectedFilePath = fileState$.selectedFilePath.use();
  const fileInfo = fileState$.fileInfo.use();
  const fileSize = fileState$.fileSize.use();
  const fileType = fileState$.fileType.use();
  const hasAudioStream = fileState$.hasAudioStream.use();
  const previewImage = fileState$.previewImage.use();

  let $detail: ReactNode;
  switch (true) {
    case loading:
      $detail = (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Loading..." />
        </List.Item.Detail.Metadata>
      );
      break;
    case fileType === FileType.video || fileType === FileType.audio:
      $detail = (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Basic File Info">
            <List.Item.Detail.Metadata.TagList.Item
              text={fileType.charAt(0).toUpperCase() + fileType.slice(1)}
              color={Color.Green}
            />
            <List.Item.Detail.Metadata.TagList.Item text={fileSizeFormat(fileSize)} color={Color.Magenta} />
            {fileType === FileType.video && !hasAudioStream && (
              <List.Item.Detail.Metadata.TagList.Item text={"No Audio"} color={Color.Red} />
            )}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="File Name" text={path.basename(selectedFilePath)} />
          <List.Item.Detail.Metadata.Label title="File Path" text={selectedFilePath} />
          <List.Item.Detail.Metadata.Separator />

          {fileInfo.map((section, sectionIndex) => {
            let sectionTagColor = Color.Blue;
            switch (section.type) {
              case "video":
                sectionTagColor = Color.Blue;
                break;
              case "audio":
                sectionTagColor = Color.Orange;
                break;
              case "other":
                sectionTagColor = Color.Red;
                break;
              default:
                break;
            }
            return (
              <Fragment key={sectionIndex}>
                <List.Item.Detail.Metadata.TagList title={section.title}>
                  <List.Item.Detail.Metadata.TagList.Item text={section.type} color={sectionTagColor} />
                </List.Item.Detail.Metadata.TagList>
                {section.data.map((item, index) => {
                  return <List.Item.Detail.Metadata.Label title={item.title} text={item.value} key={index} />;
                })}
                <List.Item.Detail.Metadata.Separator />
              </Fragment>
            );
          })}
        </List.Item.Detail.Metadata>
      );
      break;

    default:
      $detail = (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Unsupport file type" />
        </List.Item.Detail.Metadata>
      );
      break;
  }

  const previewImagePath = previewImage[selectedFilePath];
  const markdownString = previewImagePath
    ? `<img src="${previewImagePath}" alt="alt text" height="200" width="auto" />`
    : undefined;
  return <List.Item.Detail markdown={markdownString} metadata={$detail} />;
}
