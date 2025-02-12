import {
  ActionPanel,
  List,
  showToast,
  Icon,
  Color,
  Action,
  LocalStorage,
  Toast,
  Image,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { StoriesList } from "./stories";
import AddFeedForm from "./subscription-form";
import RenameFeedForm from "./rename-form";

export interface Feed {
  url: string;
  title: string;
  link?: string;
  icon: Image.ImageLike;
  originalTitle?: string;
}

function FeedsList() {
  const { isLoading, revalidate, data: feeds = [] } = usePromise(getFeeds);

  const removeFeed = async (index: number) => {
    const removedFeed = feeds.at(index) as Feed;
    const feedItems = [...feeds];
    feedItems.splice(index, 1);

    await LocalStorage.setItem("feeds", JSON.stringify(feedItems));
    await showToast({
      style: Toast.Style.Success,
      title: "Unsubscribed from the feed!",
      message: removedFeed.title,
    });
    revalidate();
  };

  const moveFeed = (index: number, change: number) => {
    if (index + change < 0 || index + change > feeds.length - 1) {
      return;
    }
    const feedItems = [...feeds] as Feed[];
    [feedItems[index], feedItems[index + change]] = [feedItems[index + change], feedItems[index]];
    revalidate();
  };

  return (
    <List
      searchBarPlaceholder="Search feeds..."
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Feed"
            target={<AddFeedForm />}
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {feeds.map((item, index) => (
        <List.Item
          key={item.url}
          title={item.title}
          icon={item.icon}
          accessories={[{ text: item.link }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title={item.title}>
                <Action.Push title="View Stories" target={<StoriesList feeds={[item]} />} icon={Icon.AppWindowList} />
                {item.link && <Action.OpenInBrowser url={item.link} />}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Add Feed"
                  target={<AddFeedForm />}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  style={Action.Style.Destructive}
                  title="Remove Feed"
                  onAction={async () => {
                    confirmAlert({
                      title: "Delete Feed?",
                      message: `Warning: This operation cannot be undone.`,
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      primaryAction: {
                        title: "Delete",
                        onAction: () => removeFeed(index),
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                  }}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                />
                <Action.Push
                  icon={Icon.Pencil}
                  title="Rename Feed"
                  target={<RenameFeedForm feed={item} feeds={feeds} onRename={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
              </ActionPanel.Section>
              {feeds.length > 1 && (
                <ActionPanel.Section>
                  {index != 0 && (
                    <Action
                      title="Move up in List"
                      onAction={() => moveFeed(index, -1)}
                      icon={{ source: Icon.ChevronUp }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    />
                  )}
                  {index != feeds.length - 1 && (
                    <Action
                      title="Move Down in List"
                      icon={{ source: Icon.ChevronDown }}
                      onAction={() => moveFeed(index, 1)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    />
                  )}
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export async function getFeeds() {
  const feedsString = (await LocalStorage.getItem("feeds")) as string;
  if (feedsString === undefined) {
    return [];
  }
  const feedItems = JSON.parse(feedsString) as Feed[];
  return feedItems;
}

export default FeedsList;
