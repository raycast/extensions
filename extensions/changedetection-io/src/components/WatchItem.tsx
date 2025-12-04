import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { WatchWithID, WatchesResponse } from "@/types";
import { callApi, getUrl, watchIcon } from "@/utils";
import CreateWatch from "@/screens/CreateWatch";
import WatchDetails from "@/screens/WatchDetails";
import WatchHistory from "@/screens/WatchHistory";
import { SeenUnseenAction } from "./SeenUnseenAction";

type WatchItemProps = {
  watch: WatchWithID;
  mutate: MutatePromise<WatchesResponse | undefined, WatchesResponse | undefined, unknown>;
  revalidate: () => void;
};

export const WatchItem = ({ watch, mutate, revalidate }: WatchItemProps) => {
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
          <Action.OpenInBrowser
            icon={Icon.QuoteBlock}
            title="Diff"
            url={getUrl(`diff/${watch.id}#text`)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          />
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
          <Action.OpenInBrowser icon={watchIcon(watch.url)} url={watch.url} shortcut={Keyboard.Shortcut.Common.Open} />
          {watch.viewed && watch.last_changed ? (
            <SeenUnseenAction markAsSeen={false} watch={watch} mutate={mutate} />
          ) : null}
          {!watch.viewed && watch.last_changed ? (
            <SeenUnseenAction markAsSeen={true} watch={watch} mutate={mutate} />
          ) : null}
          <Action
            icon={Icon.Trash}
            title="Delete Watch"
            onAction={() =>
              confirmAlert({
                title: "Delete",
                message: watch.url,
                icon: Icon.Trash,
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
            style={Action.Style.Destructive}
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
};
