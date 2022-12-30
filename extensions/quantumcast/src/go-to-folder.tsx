import * as mongoose from "mongoose";
import { Icon, List, Action, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import { Folder } from "./types";
import folderModel from "./schemas/folder";
import { mongoDB, mongoURL } from "./assets/preferences";
import { docUrlGoToFolder, cloudflowAssetUrl } from "./assets/globals";
import { framePresetsUrl } from "./assets/globals";
import getFilestoreMappings from "./io/getFrameMappings";

async function getFolders() {
  const filestoreMappings = await getFilestoreMappings(framePresetsUrl);

  const folderList: Folder[] = [];
  mongoose.set("strictQuery", false);
  await mongoose.connect(`${mongoURL}/${mongoDB}`);

  const folders = await folderModel.find();

  mongoose.disconnect();

  folders.forEach((folder) => {
    folderList.push({
      cloudflow: {
        folder: folder.cloudflow?.folder ?? "",
        enclosing_folder: folder.cloudflow?.enclosing_folder ?? "",
      },
      url: decodeURIComponent(
        `${filestoreMappings[folder.path[0]]}${folder.cloudflow?.folder?.replace(`cloudflow://${folder.path[0]}`, "")}`
      ),
      path: folder.path,
      depth: folder.depth ?? 0,
      name: folder.name ?? "Untitled",
    });
  });

  return folderList;
}

export default function Command() {
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    const fetchFolders = async () => {
      const data = await getFolders();
      setFolders(data);
    };
    fetchFolders();
  }, []);

  return (
    <List
      navigationTitle="Go to folder"
      searchBarPlaceholder="Select the folder to open in your assets"
      isLoading={true}
      isShowingDetail={true}
    >
      {folders.map((folder, idx) => (
        <List.Item
          id={folder.name + `-${idx}`}
          key={folder.name + `-${idx}`}
          title={folder.name}
          icon="../assets/quantumcast-extension-icon.png"
          accessories={[
            {
              icon: Icon.Folder,
              tooltip: folder.cloudflow.folder,
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={`${folder.name}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Folder" text={`${folder.cloudflow.folder}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="URL" text={`${folder.url}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Enclosing Folder"
                    text={`${folder.cloudflow.enclosing_folder}`}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Depth" text={`${folder.depth}`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel title="Quantumcast - Folder">
              <Action.OpenInBrowser
                title="Open in Cloudflow"
                // url={`${cloudflowAssetUrl}${encodeURIComponent("cloudflow://" + folder.path.join("/") + "/")}`}
                url={`${cloudflowAssetUrl}${encodeURIComponent(folder.cloudflow.folder)}`}
              />
              <Action.Open title="Open in Finder" target={`${folder.url}`} />
              <Action.CopyToClipboard
                title="Copy name to clipboard"
                content={folder.name}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.CopyToClipboard
                title="Copy folder to clipboard"
                content={folder.cloudflow.folder}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <Action.CopyToClipboard
                title="Copy url to clipboard"
                content={folder.url}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action.CopyToClipboard
                title="Copy enclosing folder to clipboard"
                content={folder.cloudflow.enclosing_folder}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.OpenInBrowser
                title="Open Command Documention"
                url={docUrlGoToFolder}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
