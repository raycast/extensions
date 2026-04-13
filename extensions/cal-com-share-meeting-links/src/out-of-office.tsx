import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Icon,
  Image,
  List,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { CalOOOEntry, deleteOOO, useOOOEntries } from "@api/cal.com";
import { EditOOO } from "@components/edit-ooo";
import {
  daysInRange,
  formatDateRange,
  formatWeekdayRange,
  iconForReason,
  isCurrentlyActive,
  labelForReason,
} from "@/lib/ooo";

const OOO_SETTINGS_URL = "https://app.cal.com/settings/my-account/out-of-office";
const ACCOUNT_SETTINGS_URL = "https://app.cal.com/settings/my-account/general";

export default function OutOfOffice() {
  const { data: entries, isLoading, error, mutate } = useOOOEntries();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("ooo-show-details", true);

  const handleDelete = async (entry: CalOOOEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete OOO entry?",
      message: formatDateRange(entry.start, entry.end),
      icon: { source: Icon.Trash, tintColor: Color.Red },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting OOO entry" });
    try {
      await mutate(deleteOOO(entry.id), {
        optimisticUpdate: (list) => list?.filter((e) => e.id !== entry.id),
      });
      toast.style = Toast.Style.Success;
      toast.title = "OOO entry deleted";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to delete OOO entry" });
    }
  };

  const createAction = (
    <Action.Push
      title="Create OOO"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<EditOOO mutate={mutate} />}
    />
  );

  const openOOOInBrowserAction = (
    <Action.OpenInBrowser
      title="Open OOO Settings in Browser"
      url={OOO_SETTINGS_URL}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
    />
  );

  const openAccountInBrowserAction = (
    <Action.OpenInBrowser
      title="Open Account Settings in Browser"
      url={ACCOUNT_SETTINGS_URL}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );

  const empty = !isLoading && !error && entries && entries.length === 0;

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail && !empty}>
      {error && (
        <List.EmptyView
          title="Unable to load out-of-office entries"
          description="Check your API key"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      )}
      {empty && (
        <List.EmptyView
          title="No upcoming time off"
          description="Press ⌘ N to schedule one."
          icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              {createAction}
              {openOOOInBrowserAction}
              {openAccountInBrowserAction}
            </ActionPanel>
          }
        />
      )}
      {entries?.map((entry) => (
        <List.Item
          key={entry.id}
          icon={iconForReason(entry.reason)}
          title={formatDateRange(entry.start, entry.end)}
          subtitle={formatWeekdayRange(entry.start, entry.end)}
          accessories={
            isShowingDetail
              ? []
              : [
                  ...(entry.toUser
                    ? [
                        {
                          icon: entry.toUser.avatarUrl
                            ? { source: entry.toUser.avatarUrl, mask: Image.Mask.Circle }
                            : Icon.Person,
                          text: entry.toUser.name ?? entry.toUser.email,
                          tooltip: `Redirects to ${entry.toUser.name ?? entry.toUser.email}`,
                        },
                      ]
                    : []),
                  ...(entry.notes ? [{ icon: Icon.SpeechBubble, tooltip: "Has notes" }] : []),
                  ...(isCurrentlyActive(entry) ? [{ tag: { value: "Active", color: Color.Green } }] : []),
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Reason"
                    text={labelForReason(entry.reason)}
                    icon={iconForReason(entry.reason)}
                  />
                  <List.Item.Detail.Metadata.Label title="Dates" text={formatDateRange(entry.start, entry.end)} />
                  <List.Item.Detail.Metadata.Label title="Days" text={`${daysInRange(entry.start, entry.end)}`} />
                  {entry.toUser && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Redirects To"
                        text={entry.toUser.name ?? entry.toUser.email}
                        icon={
                          entry.toUser.avatarUrl
                            ? { source: entry.toUser.avatarUrl, mask: Image.Mask.Circle }
                            : Icon.Person
                        }
                      />
                      {entry.toUser.email && (
                        <List.Item.Detail.Metadata.Label title="Email" text={entry.toUser.email} />
                      )}
                    </>
                  )}
                  {entry.notes && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Notes" text={entry.notes} />
                    </>
                  )}
                  {(entry.createdAt || entry.updatedAt) && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      {entry.createdAt && (
                        <List.Item.Detail.Metadata.Label title="Created" text={entry.createdAt.slice(0, 10)} />
                      )}
                      {entry.updatedAt && (
                        <List.Item.Detail.Metadata.Label title="Updated" text={entry.updatedAt.slice(0, 10)} />
                      )}
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="Edit OOO" icon={Icon.Pencil} target={<EditOOO entry={entry} mutate={mutate} />} />
              {openOOOInBrowserAction}
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              {createAction}
              {openAccountInBrowserAction}
              <Action
                title="Delete OOO"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(entry)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
