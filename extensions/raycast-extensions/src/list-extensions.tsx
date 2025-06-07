import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import Tags from "./components/tags.js";
import ValidExtensions from "./components/valid-extensions.js";
import { getExtensionList, initRepository } from "./git.js";
import opeartion from "./operation.js";
import { ForkedExtension } from "./types.js";
import { extensionLink, getActualIconPath, userLink } from "./utils.js";

export default function ListExtensions() {
  const [isLoading, setIsLoading] = useState(false);
  const [extensions, setExtensions] = useState<ForkedExtension[]>([]);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const foredExtensionFolders = useMemo(() => extensions.map((x) => x.folderName), [extensions]);

  const init = async () => {
    try {
      setIsLoading(true);
      await initRepository();
      const extensions = await getExtensionList();
      setExtensions(extensions);
    } catch (error) {
      console.error("Error loading extensions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      actions={
        extensions.length > 0 ? undefined : (
          <ActionPanel>
            <Action.Push
              title="Fork an Extension"
              target={<ValidExtensions forkedExtensionFolders={foredExtensionFolders} onPop={init} />}
            />
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
              <Action icon={Icon.Download} title="Pull Contributions" onAction={opeartion.pull} />
              <Action.Push
                icon={Icon.NewDocument}
                title="Fork an Extension"
                target={<ValidExtensions forkedExtensionFolders={foredExtensionFolders} onPop={init} />}
              />
              <Action
                icon={Icon.DeleteDocument}
                style={Action.Style.Destructive}
                title="Remove This Fork"
                onAction={async () => {
                  await opeartion.remove(x.folderName);
                  await init();
                }}
              />
              <Action.OpenInBrowser url={extensionLink(x.author, x.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
