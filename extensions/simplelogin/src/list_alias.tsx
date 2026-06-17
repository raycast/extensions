import { loadAllAliases, updateAliasPinnedStatus, deleteAlias, toggleAliasState } from "./api/simplelogin_api";
import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List, confirmAlert, showToast, Toast, Alert, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { AliasResponse } from "./models/alias";
import moment from "moment";

type Filter = "all" | "" | "pinned" | "others" | "with-description" | "without-description";

export default function Command() {
  const [aliases, setAliases] = useCachedState<AliasResponse[]>("aliases", []);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredAliases = useMemo(() => {
    const predicate = (alias: AliasResponse) =>
      alias.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      alias.email.toLowerCase().includes(searchText.toLowerCase()) ||
      alias.note?.toLowerCase().includes(searchText.toLowerCase());

    switch (filter) {
      case "all":
        return aliases.filter(predicate);
      case "pinned":
        return aliases.filter((alias) => alias.pinned).filter(predicate);
      case "others":
        return aliases.filter((alias) => !alias.pinned).filter(predicate);
      case "with-description":
        return aliases.filter((alias) => alias.note != null && alias.note.length > 0).filter(predicate);
      case "without-description":
        return aliases.filter((alias) => alias.note == null || alias.note.length == 0).filter(predicate);
      default:
        return [];
    }
  }, [aliases, filter, searchText]);

  useEffect(() => {
    loadAllAliases()
      .then((response) => {
        setAliases(response);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  function updatePinnedStatus(alias: AliasResponse, pinned: boolean) {
    updateAliasPinnedStatus(alias.id, pinned).then((response) => {
      if (response) {
        alias.pinned = pinned;
        setAliases([...aliases]);
        showToast({
          style: Toast.Style.Success,
          title: pinned ? "Alias pinned" : "Alias unpinned",
        });
      }
    });
  }

  async function deleteAliasPrompt(alias: AliasResponse) {
    if (
      await confirmAlert({
        title: "Are you sure?",
        message: "Do you really want to delete this alias? This action cannot be undone.",
        icon: Icon.DeleteDocument,
        rememberUserChoice: true,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      deleteAlias(alias.id);
      showToast({
        style: Toast.Style.Success,
        title: "Alias deleted",
      });
      setAliases(aliases.filter((a) => a.id != alias.id));
    }
  }

  function toggleAliasStatePrompt(alias: AliasResponse, enabled: boolean) {
    toggleAliasState(alias.id, enabled).then((response) => {
      if (response) {
        alias.enabled = !alias.enabled;
        setAliases([...aliases]);
        showToast({
          style: Toast.Style.Success,
          title: alias.enabled ? "Alias enabled" : "Alias disabled",
        });
      }
    });
  }

  function AliasListItem(props: { alias: AliasResponse }) {
    const { alias } = props;
    return (
      <List.Item
        id={`${alias.id}`}
        title={alias.email}
        icon={{ source: alias.pinned ? Icon.Pin : Icon.PinDisabled }}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Display Name" text={alias.name ?? "n/a"} />
                <List.Item.Detail.Metadata.Label
                  title="Description"
                  text={alias.note != null && alias.note?.length > 0 ? alias.note : "---"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Metadata" />
                <List.Item.Detail.Metadata.Label
                  title="Pinned"
                  text={alias.pinned ? "Yes" : "No"}
                  icon={alias.pinned ? Icon.Pin : Icon.PinDisabled}
                />
                <List.Item.Detail.Metadata.Label
                  title="Enabled"
                  text={alias.enabled ? "Yes" : "No"}
                  icon={alias.enabled ? Icon.Checkmark : Icon.XMarkCircle}
                />
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={moment(alias.creation_date).format("HH:mm DD.MM.YY")}
                  icon={Icon.Calendar}
                />
                <List.Item.Detail.Metadata.Label
                  title="Mails forwarded"
                  text={"" + alias.nb_forward}
                  icon={Icon.ArrowClockwise}
                />
                <List.Item.Detail.Metadata.Label title="Mails replied" text={"" + alias.nb_reply} icon={Icon.Forward} />
                <List.Item.Detail.Metadata.Label title="Mails blocked" text={"" + alias.nb_block} icon={Icon.Eraser} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Contained in mailbox" />
                <>
                  {alias.mailboxes.length > 0 &&
                    alias.mailboxes.map((mailbox) => (
                      <List.Item.Detail.Metadata.Label title="E-mail" text={mailbox.email} key={mailbox.id} />
                    ))}
                </>
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={alias.email} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <>
              {alias.pinned ? (
                <Action title="Unpin Alias" onAction={() => updatePinnedStatus(alias, false)} icon={Icon.PinDisabled} />
              ) : (
                <Action title="Pin Alias" onAction={() => updatePinnedStatus(alias, true)} icon={Icon.Pin} />
              )}
            </>
            <Action
              title={alias.enabled ? "Disable Alias" : "Enable Alias"}
              onAction={() => toggleAliasStatePrompt(alias, !alias.enabled)}
              icon={!alias.enabled ? Icon.Eye : Icon.EyeDisabled}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action
              title="Delete Alias"
              style={Action.Style.Destructive}
              onAction={() => deleteAliasPrompt(alias)}
              icon={Icon.DeleteDocument}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter aliases by name, email or description..."
      isShowingDetail={filteredAliases.length >= 0 && selectedId !== null}
      onSelectionChange={(selected) => {
        setSelectedId(selected);
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Aliases" value={filter} onChange={(newValue) => setFilter(newValue as Filter)}>
          <List.Dropdown.Item title="Show All" value="all" key="all" icon={Icon.Globe} />
          <List.Dropdown.Item title="Show Pinned" value="pinned" key="pinned" icon={Icon.Pin} />
          <List.Dropdown.Item title="Show Not Pinned" value="others" key="others" icon={Icon.PinDisabled} />
          <List.Dropdown.Item title="Show with description" value="with-description" icon={Icon.Text} />
          <List.Dropdown.Item title="Show without description" value="without-description" icon={Icon.StrikeThrough} />
        </List.Dropdown>
      }
    >
      <List.Section title="Pinned Aliases">
        {filteredAliases
          .filter((alias) => alias.pinned)
          .map((alias) => (
            <AliasListItem key={alias.id} alias={alias} />
          ))}
      </List.Section>
      <List.Section title="Not Pinned Aliases">
        {filteredAliases
          .filter((alias) => !alias.pinned)
          .map((alias) => (
            <AliasListItem key={alias.id} alias={alias} />
          ))}
      </List.Section>
      <List.EmptyView icon={{ source: "simplelogin_icon.png" }} title="No Aliases Found" />
    </List>
  );
}
