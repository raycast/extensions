import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  closeMainWindow,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { EditNoteForm } from "./components/edit-note-form";
import { getWebUrl } from "./config";
import { InvalidApiKeyError, showInvalidApiKeyToast } from "./utils/invalid-key";
import { Alias, listAllAliases } from "./utils/list";
import { toggleAlias } from "./utils/toggle";

type StatusFilter = "all" | "active" | "inactive";

const matchesFilter = (alias: Alias, filter: StatusFilter) => {
  if (filter === "active") {
    return alias.isActive;
  }

  if (filter === "inactive") {
    return !alias.isActive;
  }

  return true;
};

const AliasDetail = ({ alias }: { alias: Alias }) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Email" text={alias.email} />
        <List.Item.Detail.Metadata.TagList title="Status">
          <List.Item.Detail.Metadata.TagList.Item
            text={alias.isActive ? "Active" : "Inactive"}
            color={alias.isActive ? Color.Green : Color.SecondaryText}
          />
        </List.Item.Detail.Metadata.TagList>
        <List.Item.Detail.Metadata.Label title="Note" text={alias.note || "—"} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Forwarded" text={`${alias.totalForwarded}`} icon={Icon.ArrowRight} />
        <List.Item.Detail.Metadata.Label title="Blocked" text={`${alias.totalBlocked}`} icon={Icon.XMarkCircle} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Created" text={alias.createdAt.toLocaleString()} />
        <List.Item.Detail.Metadata.Label title="Updated" text={alias.updatedAt.toLocaleString()} />
      </List.Item.Detail.Metadata>
    }
  />
);

const ListEmails = () => {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-alias-details", false);

  const {
    isLoading,
    data: aliases,
    revalidate,
  } = useCachedPromise(listAllAliases, [], {
    initialData: [],
    onError: async (error) => {
      if (error instanceof InvalidApiKeyError) {
        await showInvalidApiKeyToast();
        return;
      }

      await showFailureToast(error, { title: "Error listing" });
    },
  });

  const setAliasActive = async (email: string, activate: boolean) => {
    const toast = await showToast(Toast.Style.Animated, activate ? "🔄 Activating" : "🔄 Deactivating", email);
    const failureTitle = activate ? "❌ Error activating email" : "❌ Error deactivating email";

    try {
      const success = await toggleAlias(email, activate);

      if (!success) {
        toast.style = Toast.Style.Failure;
        toast.title = failureTitle;
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = activate ? "✅ Email activated" : "✅ Email deactivated";
      revalidate();
    } catch (error) {
      if (error instanceof InvalidApiKeyError) {
        await showInvalidApiKeyToast(toast);
        return;
      }

      toast.style = Toast.Style.Failure;
      toast.title = failureTitle;
    }
  };

  return (
    <List
      searchBarPlaceholder="Search emails and notes..."
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          storeValue={true}
          onChange={(value) => setFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title="All Aliases" value="all" />
          <List.Dropdown.Item title="Active" value="active" icon={Icon.Envelope} />
          <List.Dropdown.Item title="Inactive" value="inactive" icon={Icon.LightBulbOff} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Envelope}
        title={isLoading ? "Loading aliases..." : "No aliases found"}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open HideMail Dashboard" url={getWebUrl("/dashboard")} />
          </ActionPanel>
        }
      />
      {aliases
        .filter((alias) => matchesFilter(alias, filter))
        .map((alias) => (
          <List.Item
            key={alias.email}
            title={alias.email}
            subtitle={isShowingDetail ? undefined : alias.note}
            keywords={[...alias.note.split(" "), alias.email]}
            accessories={
              isShowingDetail
                ? undefined
                : [
                    { tooltip: "Forwarded", text: `F: ${alias.totalForwarded}` },
                    { tooltip: "Blocked", text: `B: ${alias.totalBlocked}` },
                    { date: alias.createdAt, tooltip: `Created ${alias.createdAt.toLocaleString()}` },
                  ]
            }
            icon={alias.isActive ? Icon.Envelope : Icon.LightBulbOff}
            detail={<AliasDetail alias={alias} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy to Clipboard"
                    onAction={async () => {
                      await Clipboard.copy(alias.email);
                      await closeMainWindow();
                      await showHUD("Copied email to clipboard!");
                    }}
                    icon={Icon.Clipboard}
                  />
                  <Action.Push
                    title="Edit Note"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<EditNoteForm alias={alias} onSaved={revalidate} />}
                  />
                  {alias.isActive ? (
                    <Action
                      title="Deactivate"
                      onAction={() => setAliasActive(alias.email, false)}
                      icon={Icon.XMarkCircle}
                    />
                  ) : (
                    <Action title="Activate" onAction={() => setAliasActive(alias.email, true)} icon={Icon.Checkmark} />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={isShowingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                    onAction={() => setIsShowingDetail(!isShowingDetail)}
                  />
                  <Action.OpenInBrowser
                    title="Open HideMail Dashboard"
                    url={getWebUrl("/dashboard")}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

export default ListEmails;
