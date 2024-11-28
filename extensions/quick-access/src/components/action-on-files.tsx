import {
  Action,
  ActionPanel,
  Application,
  Clipboard,
  closeMainWindow,
  Icon,
  showHUD,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { isDirectory } from "../utils/common-utils";
import { FolderPageList } from "./folder-page-list";
import { Layout, TypeDirectory } from "../types/types";
import { FolderPageGrid } from "./folder-page-grid";
import { layout } from "../types/preferences";
import { copyFileByPath } from "../utils/applescript-utils";
import { MutatePromise } from "@raycast/utils";

export function ActionsOnFiles(props: {
  frontmostApp: Application | undefined;
  isTopFolder: boolean;
  primaryAction: string;
  name: string;
  path: string;
  mutate: MutatePromise<TypeDirectory[] | undefined, TypeDirectory[] | undefined>;
}) {
  const { pop } = useNavigation();
  const { frontmostApp, isTopFolder, primaryAction, name, path, mutate } = props;
  return (
    <>
      <PrimaryActionOnFile frontmostApp={frontmostApp} primaryAction={primaryAction} name={name} path={path} />

      <ActionPanel.Section>
        <Action.OpenWith shortcut={{ modifiers: ["shift", "cmd"], key: "o" }} path={path} />
        <Action.ShowInFinder shortcut={{ modifiers: ["shift", "cmd"], key: "s" }} path={path} />
        <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
        <Action
          icon={Icon.Repeat}
          title={"Refresh Files"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={mutate}
        />
      </ActionPanel.Section>
      {!isTopFolder && (
        <Action
          icon={Icon.ChevronUp}
          title={"Enclosing Folder"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          onAction={pop}
        />
      )}
      {isDirectory(path) && (
        <Action.Push
          icon={Icon.ChevronDown}
          title={"Enter Folder"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          target={
            layout === Layout.LIST ? (
              <FolderPageList
                frontmostApp={frontmostApp}
                folderName={name}
                folderPath={path}
                primaryAction={primaryAction}
              />
            ) : (
              <FolderPageGrid
                frontmostApp={frontmostApp}
                folderName={name}
                folderPath={path}
                primaryAction={primaryAction}
              />
            )
          }
        />
      )}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Name"}
          content={name}
          shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title={"Copy Path"}
          content={path}
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "c" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.Trash
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          paths={path}
          onTrash={async () => {
            await mutate();
          }}
        />
      </ActionPanel.Section>
    </>
  );
}

export function PrimaryActionOnFile(props: {
  frontmostApp: Application | undefined;
  primaryAction: string;
  name: string;
  path: string;
}) {
  const { frontmostApp, primaryAction, name, path } = props;
  if (primaryAction === "Copy") {
    return (
      <>
        <Action
          icon={Icon.CopyClipboard}
          title={"Copy to Clipboard"}
          onAction={async () => {
            await showHUD(`${name} is copied to clipboard`);
            await copyFileByPath(path);
          }}
        />

        <Action
          icon={frontmostApp ? { fileIcon: frontmostApp.path } : Icon.Desktop}
          title={frontmostApp ? `Paste to ${frontmostApp.name}` : "Paste"}
          onAction={async () => {
            await closeMainWindow();
            await Clipboard.paste({ file: path });
          }}
        />
        <Action.Open shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }} title={"Open in Finder"} target={path} />
      </>
    );
  } else {
    return (
      <>
        <Action
          icon={frontmostApp ? { fileIcon: frontmostApp.path } : Icon.Desktop}
          title={frontmostApp ? `Paste to ${frontmostApp.name}` : "Paste"}
          onAction={async () => {
            await closeMainWindow();
            await Clipboard.paste({ file: path });
          }}
        />
        <Action
          icon={Icon.CopyClipboard}
          title={"Copy to Clipboard"}
          onAction={async () => {
            await copyFileByPath(path);
          }}
        />
        <Action.Open shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }} title={"Open in Finder"} target={path} />
      </>
    );
  }
}
