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
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { withGithubClient } from "./api.js";
import { CreateExtension, Diagnostics, SyncFork, Tags, ValidExtensions } from "./components/index.js";
import { catchError, handleError } from "./errors.js";
import * as git from "./git.js";
import operation from "./operation.js";
import { ForkedExtension } from "./types.js";
import { extensionLink, getActualIconPath, userLink } from "./utils.js";

function ManageForkedExtensions() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [forkedRepository, setForkedRepository] = useState<string>();
  const { push } = useNavigation();

  const {
    data: { extensions = [], forkedExtensionFolders = [] } = {},
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (): Promise<{
      extensions: ForkedExtension[];
      forkedExtensionFolders: string[];
    }> => {
      const forkedRepository = await operation.init();
      setForkedRepository(forkedRepository);
      const extensions = await git.getExtensionList();
      const forkedExtensionFolders = extensions.map((x) => x.folderName);
      return { extensions, forkedExtensionFolders };
    },
    [],
    {
      onError: (error) => {
        handleError(error, {
          primaryAction: {
            title: "Run Diagnostics",
            onAction: () => {
              push(<Diagnostics />);
            },
          },
        });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      actions={
        extensions.length > 0 ? undefined : (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="Fork an Extension"
                shortcut={Keyboard.Shortcut.Common.New}
                icon={Icon.NewDocument}
                target={<ValidExtensions forkedExtensionFolders={forkedExtensionFolders} onPop={revalidate} />}
              />
              <CreateExtension />
              <Action.ShowInFinder title="Show Repository in Finder" path={git.repositoryPath} />
              <SyncFork forkedRepository={forkedRepository} onSyncFinished={revalidate} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push icon={Icon.WrenchScrewdriver} title="Run Diagnostics" target={<Diagnostics />} />
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel.Section>
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
              <ActionPanel.Section>
                <Action icon={Icon.Eye} title="Show Details" onAction={() => setIsShowingDetail(!isShowingDetail)} />
                <Action.OpenWith path={x.folderPath} />
                <Action.CopyToClipboard
                  title="Copy Extension Path to Clipboard"
                  content={x.folderPath}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.Push
                  icon={Icon.NewDocument}
                  title="Fork an Extension"
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<ValidExtensions forkedExtensionFolders={forkedExtensionFolders} onPop={revalidate} />}
                />
                <CreateExtension />
                <SyncFork forkedRepository={forkedRepository} onSyncFinished={revalidate} />
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
                        onAction: catchError(async () => {
                          await operation.remove(x.folderName);
                          revalidate();
                        }),
                      },
                    });
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push icon={Icon.WrenchScrewdriver} title="Run Diagnostics" target={<Diagnostics />} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withGithubClient(ManageForkedExtensions);
