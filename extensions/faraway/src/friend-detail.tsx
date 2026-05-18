import { Action, ActionPanel, Alert, Detail, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { pathToFileURL } from "node:url";
import FriendForm from "./friend-form";
import { deleteFriend, listFriends, updateFriend } from "./lib/storage";
import { formatTimeInTz, isNightInTz } from "./lib/time";
import { t } from "./lib/i18n";

type Props = {
  friendId: string;
  onChange?: () => void;
};

const PHOTO_WIDTH = 280;

export default function FriendDetail({ friendId, onChange }: Props) {
  const { data, isLoading, revalidate } = useCachedPromise(listFriends, [], { initialData: [] });
  const { push, pop } = useNavigation();
  const friend = data?.find((f) => f.id === friendId);

  if (!friend) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  const time = formatTimeInTz(friend.timezone);
  const night = isNightInTz(friend.timezone);

  // The avatar PNG on disk is already cropped to a circle with transparent corners,
  // so a plain markdown image renders perfectly round and undistorted.
  // Cache-bust the URL with mtime so updated photos refresh without a stale cache hit.
  const photoBlock = friend.avatarPath
    ? `![](${pathToFileURL(friend.avatarPath).href}?raycast-width=${PHOTO_WIDTH}&v=${friend.id})`
    : "";

  const markdown = `${photoBlock}\n\n# ${friend.name}\n\n${friend.cityLabel} · ${time}${night ? " 🌙" : ""}`;

  async function handleDelete() {
    if (!friend) return;
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
      onChange?.();
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("friendDeleteFailed"),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleRemovePhoto() {
    if (!friend?.avatarPath) return;
    try {
      await updateFriend(friend.id, {
        name: friend.name,
        timezone: friend.timezone,
        cityLabel: friend.cityLabel,
        clearAvatar: true,
      });
      await showToast({ style: Toast.Style.Success, title: t("friendSaved") });
      revalidate();
      onChange?.();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("saveFailed"),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function openEdit() {
    if (!friend) return;
    push(
      <FriendForm
        friend={friend}
        onSaved={() => {
          revalidate();
          onChange?.();
        }}
      />,
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={friend.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={t("detailCity")} text={friend.cityLabel} />
          <Detail.Metadata.Label
            title={t("detailTime")}
            text={`${time}${night ? "  🌙" : ""}`}
            icon={night ? Icon.Moon : Icon.Sun}
          />
          <Detail.Metadata.Label title={t("detailTimezone")} text={friend.timezone} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action icon={Icon.Pencil} title={t("edit")} onAction={openEdit} />
          <Action
            icon={Icon.Image}
            title={t("replacePhoto")}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={openEdit}
          />
          {friend.avatarPath ? (
            <Action
              icon={Icon.XMarkCircle}
              title={t("removePhoto")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={handleRemovePhoto}
            />
          ) : null}
          <Action
            icon={Icon.Trash}
            title={t("delete")}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
}
