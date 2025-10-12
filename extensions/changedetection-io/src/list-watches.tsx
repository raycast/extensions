import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { callApi, validUrl, useWatches } from "./api";
import CreateWatch from "./components/CreateWatch";
import WatchDetails from "./components/WatchDetails";
import WatchHistory from "./components/WatchHistory";
import { getUrl, watchIcon } from "./utils";

const ListWatches = () => {
  if (!validUrl()) {
    return (
      <Detail
        markdown={"# Error \n\n Invalid URL"}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const { isLoading, data, error, revalidate, mutate } = useWatches();

  return (
    <List isLoading={isLoading}>
      {!isLoading && !error && (
        <List.EmptyView
          title="No website watches configured."
          description="Create new watch."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Watch" target={<CreateWatch onCreate={revalidate} />} />
            </ActionPanel>
          }
        />
      )}
      {data.map((watch) => {
        return (
          <List.Item
            key={watch.id}
            icon={watchIcon(watch.url)}
            title={watch.url}
            subtitle={watch.title ?? undefined}
            keywords={watch.title ? [watch.title] : undefined}
            accessories={[
              {
                ...(watch.last_error && {
                  icon: { source: Icon.Warning, tintColor: Color.Red },
                  tooltip: watch.last_error,
                }),
              },
              { icon: watch.viewed ? Icon.Eye : Icon.EyeDisabled, tooltip: watch.viewed ? "Viewed" : "Not Viewed" },
              watch.last_checked
                ? { date: new Date(watch.last_checked * 1000), tooltip: "Last Checked", icon: Icon.MagnifyingGlass }
                : { text: "Not yet", tooltip: "Last Checked", icon: Icon.MagnifyingGlass },
              watch.last_changed
                ? { date: new Date(watch.last_changed * 1000), tooltip: "Last Changed", icon: Icon.Pencil }
                : { text: "Not yet", tooltip: "Last Changed", icon: Icon.Pencil },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Eye} title="View Details" target={<WatchDetails id={watch.id} />} />
                <Action.OpenInBrowser icon={Icon.ArrowNe} title="Preview" url={getUrl(`preview/${watch.id}#text`)} />
                <Action.Push
                  icon={Icon.List}
                  title="View History"
                  target={<WatchHistory id={watch.id} />}
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                />
                <Action.OpenInBrowser
                  icon={Icon.ArrowNe}
                  title="Edit"
                  url={getUrl(`edit/${watch.id}#general`)}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
                <Action.OpenInBrowser
                  icon={watchIcon(watch.url)}
                  url={watch.url}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Watch"
                  onAction={() =>
                    confirmAlert({
                      title: "Delete",
                      message: watch.url,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete Watch?",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting");
                          try {
                            await mutate(
                              callApi(`watch/${watch.id}`, {
                                method: "DELETE",
                              }),
                              {
                                optimisticUpdate(data) {
                                  if (data) delete data[watch.id];
                                  return data;
                                },
                                shouldRevalidateAfter: false,
                              },
                            );
                            toast.style = Toast.Style.Success;
                            toast.title = "Deleted";
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = `${error}`;
                          }
                        },
                      },
                    })
                  }
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Watch"
                  target={<CreateWatch onCreate={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default ListWatches;
