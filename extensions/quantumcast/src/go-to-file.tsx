import * as mongoose from "mongoose";
import { Icon, List, Action, ActionPanel, Cache, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import { File } from "./types";
import fileModel from "./schemas/file";
import { mongoDB, mongoURL } from "./assets/preferences";
import {
  docUrlGoToFile,
  cloudflowAssetUrl,
  cloudflowProofscopeUrl,
  packzFileTypes,
  cloudflowProofscopeFileTypes,
} from "./assets/globals";
import { framePresetsUrl } from "./assets/globals";
import getFilestoreMappings from "./io/getFrameMappings";

async function getFiles() {
  const filestoreMappings = await getFilestoreMappings(framePresetsUrl);

  const filesList: File[] = [];
  mongoose.set("strictQuery", false);
  await mongoose.connect(`${mongoURL}/${mongoDB}`);

  // ----------------------------------------------------------------------------------
  // Caching test - Capacity is set to 100MB (100000000 Bytes) - Default is 10MB
  // ----------------------------------------------------------------------------------

  const cache = new Cache({ capacity: 100000000, namespace: environment.commandName });

  cache.set("files", JSON.stringify(await fileModel.find()));

  mongoose.disconnect();

  const cached = cache.get("files");
  const cachedFiles: File[] = cached ? JSON.parse(cached) : [];

  // ----------------------------------------------------------------------------------

  cachedFiles.forEach((file) => {
    filesList.push({
      cloudflow: {
        file: file.cloudflow?.file ?? "",
        enclosing_folder: file.cloudflow?.enclosing_folder ?? "",
      },
      url: decodeURI(
        `${filestoreMappings[file.path[0]]}${file.cloudflow?.enclosing_folder?.replace(
          `cloudflow://${file.path[0]}`,
          ""
        )}`
      ),
      path: file.path,
      filetype: file.filetype ?? "Unknown",
      file_extension: file.file_extension ?? "Unknown",
      file_name: file.file_name ?? "Untitled",
      document_name: file.document_name ?? "Untitled",
    });
  });

  return filesList;
}

export default function Command() {
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      const data = await getFiles();
      setFiles(data);
    };
    fetchFiles();
  }, []);

  return (
    <List
      navigationTitle="Go to file"
      searchBarPlaceholder={`Search for one of the ${files.length} files found in your database.`}
      isLoading={true}
      isShowingDetail={true}
    >
      {files.map((file, idx) => (
        <List.Item
          id={file.document_name + `-${idx}`}
          key={file.document_name + `-${idx}`}
          title={file.file_name}
          icon="../assets/quantumcast-extension-icon.png"
          accessories={[
            {
              icon: Icon.Folder,
              tooltip: file.cloudflow.file,
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Title" text={`${file.document_name}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Name" text={`${file.file_name}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Extension" text={`${file.file_extension}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="MIME Type" text={`${file.filetype}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Folder" text={`${file.cloudflow.enclosing_folder}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="URL" text={`${file.url}`} />
                  <List.Item.Detail.Metadata.Separator />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel title="Quantumcast - File">
              <Action.OpenInBrowser
                title="Open File in Cloudflow"
                url={`${cloudflowAssetUrl}${encodeURIComponent(file.cloudflow.file)}`}
              />
              {packzFileTypes.includes(file.file_extension.toLowerCase()) && (
                <Action.Open icon={Icon.Pencil} title="Open file in Packz" target={`${file.url}/${file.file_name}`} />
              )}
              <Action.OpenInBrowser
                icon={Icon.Folder}
                title="Reveal in Filestore"
                url={`${cloudflowAssetUrl}${encodeURIComponent(file.cloudflow.enclosing_folder)}`}
              />
              <Action.Open title="Reveal in Finder" target={`${file.url}`} />
              {cloudflowProofscopeFileTypes.includes(file.file_extension.toLowerCase()) && (
                <Action.Open
                  title="Open in Proofscope"
                  target={`${cloudflowProofscopeUrl}${encodeURIComponent(file.cloudflow.file)}`}
                />
              )}
              <Action.CopyToClipboard
                title="Copy title to clipboard"
                content={file.file_name}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action.CopyToClipboard
                title="Copy name to clipboard"
                content={file.file_name}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.CopyToClipboard
                title="Copy folder to clipboard"
                content={file.cloudflow.enclosing_folder}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <Action.CopyToClipboard
                title="Copy URL to clipboard"
                content={file.url}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action.CopyToClipboard
                title="Copy MIME type to clipboard"
                content={file.filetype}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
              />
              <Action.OpenInBrowser
                title="Open Command Documention"
                url={docUrlGoToFile}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
