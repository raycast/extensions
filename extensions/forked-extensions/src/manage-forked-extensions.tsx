import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { withGithubClient } from "./api.js";
import Tags from "./components/tags.js";
import SyncFork from "./components/sync-fork.js";
import ValidExtensions from "./components/valid-extensions.js";
import * as git from "./git.js";
import operation from "./operation.js";
import { ForkedExtension } from "./types.js";
import { extensionLink, getActualIconPath, userLink } from "./utils.js";

function ManageForkedExtensions() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const {
    data: { extensions = [], forkedExtensionFolders = [], forkedRepository } = {},
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (): Promise<{
      extensions: ForkedExtension[];
      forkedExtensionFolders: string[];
      forkedRepository?: string;
    }> => {
      const forkedRepository = await operation.init();
      const extensions = await git.getExtensionList();
      const forkedExtensionFolders = extensions.map((x) => x.folderName);
      return { extensions, forkedExtensionFolders, forkedRepository };
    },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      actions={
        extensions.length > 0 ? undefined : (
          <ActionPanel>
            <Action.Push
              title="Fork an Extension"
              shortcut={Keyboard.Shortcut.Common.New}
              icon={Icon.NewDocument}
              target={<ValidExtensions forkedExtensionFolders={forkedExtensionFolders} onPop={revalidate} />}
            />
            <Action.ShowInFinder title="Show Repository in Finder" path={git.repositoryPath} />
            <SyncFork forkedRepository={forkedRepository} />
            <Action onAction={openExtensionPreferences} title="Open Extension Preferences" icon={Icon.Gear} />
          </ActionPanel>
        )
      }
    >
      {extensions.map((x) => (
        <List.Item
          key={x.folderName}
          icon={getActualIconPath(x)}
          title={x.title}
          subtitle={x.description}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={x.name} />
                  <List.Item.Detail.Metadata.Label title="Title" text={x.title} />
                  <List.Item.Detail.Metadata.Label title="Description" text={x.description} />
                  <List.Item.Detail.Metadata.Separator />
                  <Tags title="Author" tags={[x.author]} color={Color.Green} link={userLink} />
                  <Tags title="Categories" tags={x.categories} color={Color.Orange} />
                  <Tags title="Contributors" tags={x.contributors} color={Color.Blue} link={userLink} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action icon={Icon.Eye} title="Show Details" onAction={() => setIsShowingDetail(!isShowingDetail)} />
              <Action.OpenWith path={x.folderPath} />
              <Action.CopyToClipboard title="Copy Extension Path to Clipboard" content={x.folderName} shortcut={Keyboard.Shortcut.Common.Copy} />
              <Action.Push
                icon={Icon.NewDocument}
                title="Fork an Extension"
                shortcut={Keyboard.Shortcut.Common.New}
                target={<ValidExtensions forkedExtensionFolders={forkedExtensionFolders} onPop={revalidate} />}
              />
              <Action.ShowInFinder title="Show Extension in Finder" path={x.folderPath} />
              <Action.ShowInFinder title="Show Repository in Finder" path={git.repositoryPath} />
              <Action.OpenInBrowser url={extensionLink(x.author, x.name)} shortcut={Keyboard.Shortcut.Common.Open} />
              <Action
                icon={Icon.DeleteDocument}
                style={Action.Style.Destructive}
                title="Remove Fork"
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  await confirmAlert({
                    title: "Remove Fork",
                    message: "Are you sure you want to remove this fork?",
                    rememberUserChoice: true,
                    primaryAction: {
                      title: "Remove",
                      style: Alert.ActionStyle.Destructive,
                      onAction: async () => {
                        await operation.remove(x.folderName);
                        revalidate();
                      },
                    },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withGithubClient(ManageForkedExtensions);
