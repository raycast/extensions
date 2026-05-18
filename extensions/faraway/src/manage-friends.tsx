import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Image,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import FriendDetail from "./friend-detail";
import FriendForm from "./friend-form";
import { Friend, deleteFriend, listFriends } from "./lib/storage";
import { formatTimeInTz, isNightInTz, minutesSinceMidnight } from "./lib/time";
import { t } from "./lib/i18n";

export default function ManageFriends() {
  const { data, isLoading, revalidate } = useCachedPromise(listFriends, [], { initialData: [] });
  const { push } = useNavigation();

  const friends = [...(data ?? [])].sort((a, b) => {
    const cityCmp = a.cityLabel.localeCompare(b.cityLabel);
    if (cityCmp !== 0) return cityCmp;
    return minutesSinceMidnight(a.timezone) - minutesSinceMidnight(b.timezone);
  });

  async function handleDelete(friend: Friend) {
    const confirmed = await confirmAlert({
      title: t("confirmDeleteTitle"),
      message: t("confirmDeleteMessage"),
      primaryAction: { title: t("delete"), style: Alert.ActionStyle.Destructive },
      dismissAction: { title: t("cancel") },
    });
    if (!confirmed) return;
    try {
      await deleteFriend(friend.id);
      await showToast({ style: Toast.Style.Success, title: t("friendDeleted") });
      revalidate();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("friendDeleteFailed"),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t("manageFriends")}>
      {friends.length === 0 ? (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title={t("noFriendsTitle")}
          description={t("noFriendsDescription")}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.PlusCircle}
                title={t("addFriend")}
                onAction={() => push(<FriendForm onSaved={() => revalidate()} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        friends.map((friend) => {
          const time = formatTimeInTz(friend.timezone);
          const night = isNightInTz(friend.timezone);
          const icon = friend.avatarPath
            ? { source: friend.avatarPath, mask: Image.Mask.Circle }
            : { source: Icon.Person, tintColor: Color.SecondaryText };
          return (
            <List.Item
              key={friend.id}
              icon={icon}
              title={friend.name}
              subtitle={friend.cityLabel}
              accessories={[night ? { tag: { value: "🌙", color: Color.Blue } } : {}, { text: time }].filter(
                (a) => Object.keys(a).length > 0,
              )}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Eye}
                    title={t("showDetails")}
                    onAction={() => push(<FriendDetail friendId={friend.id} onChange={() => revalidate()} />)}
                  />
                  <Action
                    icon={Icon.Pencil}
                    title={t("edit")}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => push(<FriendForm friend={friend} onSaved={() => revalidate()} />)}
                  />
                  <Action
                    icon={Icon.PlusCircle}
                    title={t("addFriend")}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<FriendForm onSaved={() => revalidate()} />)}
                  />
                  <Action
                    icon={Icon.Trash}
                    title={t("delete")}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(friend)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
