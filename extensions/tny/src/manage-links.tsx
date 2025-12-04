import links from "./queries/links";
import Client from "./utils/Client";
import linkDelete from "./mutations/linkDelete";
import { TnyLink } from "./types";
import { authorize } from "./utils/Auth";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Icon, List, showHUD, showToast, Toast } from "@raycast/api";

export default function Command() {
  const [items, setItems] = useState([] as TnyLink[]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const retrieveLinks = async (): Promise<TnyLink[]> => {
    await authorize();

    console.log(`Loading list of links with query:${searchQuery}`);

    setIsLoading(true);

    try {
      const result = await Client.query({
        query: links,
        variables: {
          search: searchQuery,
        },
        fetchPolicy: "network-only",
      });

      return result.data.viewer.links.data;
    } catch (error) {
      console.log(error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load your Tny links!",
      });

      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadLinks = () => {
    retrieveLinks().then((links) => setItems(links));
  };

  useEffect(loadLinks, [searchQuery]);

  async function copyLink(url: string) {
    try {
      await Clipboard.copy(url);

      await showToast({
        style: Toast.Style.Success,
        title: "Copied the Tny URL to your clipboard!",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to copy the Tny URL to your clipboard!",
      });
    }
  }

  async function deleteLink(id: string) {
    try {
      await Client.mutate({
        mutation: linkDelete,
        variables: {
          id: id,
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Successfully deleted your Tny link!",
      });

      loadLinks();
    } catch (error) {
      console.log(error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to delete your Tny link!",
      });
    }
  }

  async function replaceSelected(url: string) {
    const content: Clipboard.Content = {
      text: url,
    };

    await Clipboard.paste(content);

    await showHUD("Successfully replaced URL with Tny URL!");
  }

  return (
    <List
      throttle={true}
      filtering={false}
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder="Search Tny..."
    >
      {items.map((link: TnyLink, index: number) => (
        <List.Item
          key={index}
          title={link.original}
          icon={{
            source: link.favicon,
          }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link title="Tny URL" text={link.url} target={link.url} />
                  <List.Item.Detail.Metadata.Link title="Original" text={link.original} target={link.original} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Clicks" text={link.clicks.toString()} />
                  <List.Item.Detail.Metadata.Label title="Created" text={link.createdAt} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel title="Manage link">
              <Action title="Copy Tny URL" icon={Icon.CopyClipboard} onAction={() => copyLink(link.url)} />
              <Action title="Copy Original URL" icon={Icon.CopyClipboard} onAction={() => copyLink(link.original)} />
              <Action
                title="Replace Selected with Tny URL"
                icon={Icon.Clipboard}
                onAction={() => replaceSelected(link.url)}
              />
              <Action
                title="Delete Tny URL"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => deleteLink(link.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
