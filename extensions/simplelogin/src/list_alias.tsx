import { loadAllAliases, updateAliasPinnedStatus, deleteAlias, toggleAliasState } from "./api/simplelogin_api";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, confirmAlert, showToast, Toast, Alert } from "@raycast/api";
import { AliasResponse } from "./models/alias";
import moment from "moment";

export default function Command() {
  const [aliases, setAliases] = useState<AliasResponse[] | undefined>(undefined);
  const [filteredAlias, setFilteredAlias] = useState<AliasResponse[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAllAliases()
      .then((response) => {
        setAliases(response);
        setFilteredAlias(aliases);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    new Promise((resolve) => {
      setFilteredAlias(aliases);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [aliases]);

  function filterDropdownList(newValue: string) {
    if (newValue == "all") {
      setFilteredAlias(aliases);
    } else if (newValue == "pinned") {
      setFilteredAlias(aliases && aliases.filter((alias) => alias.pinned));
    } else if (newValue == "others") {
      setFilteredAlias(aliases && aliases.filter((alias) => !alias.pinned));
    }
  }

  function updatePinnedStatus(alias: AliasResponse, pinned: boolean) {
    updateAliasPinnedStatus(alias.id, pinned).then((response) => {
      if (response) {
        alias.pinned = pinned;
        if (aliases != undefined) {
          setAliases([...aliases]);
        }
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
      setAliases(aliases && aliases.filter((a) => a.id != alias.id));
    }
  }

  function toggleAliasStatePrompt(alias: AliasResponse, enabled: boolean) {
    toggleAliasState(alias.id, enabled).then((response) => {
      if (response) {
        alias.enabled = !alias.enabled;
        if (aliases != undefined) {
          setAliases([...aliases]);
        }
        showToast({
          style: Toast.Style.Success,
          title: alias.enabled ? "Alias enabled" : "Alias disabled",
        });
      }
    });
  }

  function aliasListItem(alias: AliasResponse) {
    return (
      <List.Item
        key={alias.id}
        title={alias.email}
        icon={{ source: alias.pinned ? Icon.Pin : Icon.PinDisabled }}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Name" text={alias.name ?? "n/a"} />
                <List.Item.Detail.Metadata.Label
                  title="Note"
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
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter aliases by name..."
      isShowingDetail={filteredAlias != undefined && filteredAlias.length > 0}
      searchBarAccessory={
        <>
          {filteredAlias != undefined && filteredAlias.length > 0 ? (
            <List.Dropdown
              tooltip="Filter Aliases"
              onChange={(newValue) => {
                filterDropdownList(newValue);
              }}
            >
              <List.Dropdown.Item title="Show All" value="all" key="all" icon={Icon.Globe} />
              <List.Dropdown.Item title="Show Pinned" value="pinned" key="pinned" icon={Icon.Pin} />
              <List.Dropdown.Item title="Show Not Pinned" value="others" key="others" icon={Icon.PinDisabled} />
            </List.Dropdown>
          ) : (
            ""
          )}
        </>
      }
    >
      <List.Section title="Pinned Aliases">
        <>
          {aliases != undefined &&
            filteredAlias != undefined &&
            aliases.length > 0 &&
            filteredAlias
              .filter((alias) => alias.pinned)
              .map((alias) => {
                return aliasListItem(alias);
              })}
        </>
      </List.Section>
      <List.Section title="Not Pinned Aliases">
        <>
          {aliases != undefined &&
            filteredAlias != undefined &&
            aliases.length > 0 &&
            filteredAlias
              .filter((alias) => !alias.pinned)
              .map((alias) => {
                return aliasListItem(alias);
              })}
        </>
      </List.Section>
      <List.EmptyView icon={{ source: "simplelogin_icon.png" }} title="No alias found" />
    </List>
  );
}
