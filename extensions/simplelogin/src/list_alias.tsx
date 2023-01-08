import { loadAllAliases, updateAliasPinnedStatus, deleteAlias, toggleAliasState } from "./api/simplelogin_api";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, confirmAlert, showToast, Toast, Alert } from "@raycast/api";
import { AliasResponse } from "./models/alias";
import moment from "moment";

export default function Command() {
    const [aliases, setAliases] = useState<AliasResponse[]>([]);
    const [filteredAlias, setFilteredAlias] = useState<AliasResponse[] | undefined>(undefined);

    useEffect(() => {
        loadAllAliases().then((response) => {
            setAliases(response);
        });
    }, []);

    useEffect(() => {
        setFilteredAlias(aliases);
        console.log('length filtered: ' + filteredAlias?.length)
    }, [aliases]);

    function onDrinkTypeChange(newValue: string) {
        if (newValue == "all") {
            setFilteredAlias(aliases);
        } else if (newValue == "pinned") {
            setFilteredAlias(aliases.filter((alias) => alias.pinned));
        } else if (newValue == "others") {
            setFilteredAlias(aliases.filter((alias) => !alias.pinned));
        }
    }

    function updatePinnedStatus(alias: AliasResponse, pinned: boolean) {
        updateAliasPinnedStatus(alias.id, pinned).then((response) => {
            if (response) {
                alias.pinned = pinned;
                setAliases([...aliases]);
                showToast({
                    style: Toast.Style.Success,
                    title: pinned ? "Alias pinned" : 'Alias unpinned'
                });
            }
        });
    }

    async function deleteAliasPrompt(alias: AliasResponse) {
        if (await confirmAlert({
            title: "Are you sure?",
            message: "Do you really want to delete this alias? This action cannot be undone.",
            icon: Icon.DeleteDocument,
            primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
            }
        })) {
            deleteAlias(alias.id);
            showToast({
                style: Toast.Style.Success,
                title: 'Alias deleted'
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
                    title: alias.enabled ? "Alias enabled" : 'Alias disabled'
                });
            }
        });
    }

    return (
        <List
            isLoading={filteredAlias === undefined}
            searchBarPlaceholder="Filter aliases by name..."
            isShowingDetail={filteredAlias != undefined && filteredAlias.length > 0}
            searchBarAccessory={
                <>{(filteredAlias != undefined && filteredAlias.length > 0) ? 
                    <List.Dropdown
                        tooltip="Filter Aliases"
                        onChange={(newValue) => {
                            onDrinkTypeChange(newValue);
                        }}
                    >
                        <List.Dropdown.Item title="show all" value="all" key="all" icon={Icon.Globe} />
                        <List.Dropdown.Item title="show pinned" value="pinned" key="pinned" icon={Icon.Pin} />
                        <List.Dropdown.Item title="show not Pinned" value="others" key="others" icon={Icon.PinDisabled} />
                    </List.Dropdown> :''}</>
            }
        >
            <>
                {filteredAlias != undefined &&
                    filteredAlias.length > 0 &&
                    filteredAlias.map((alias) => {
                        return (
                            <List.Item
                                key={alias.id}
                                title={alias.email}
                                icon={Icon.Minus}
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
                                                    text={alias.pinned ? "yes" : "no"}
                                                    icon={alias.pinned ? Icon.Pin : Icon.PinDisabled}
                                                />
                                                <List.Item.Detail.Metadata.Label
                                                    title="Enabled"
                                                    text={alias.enabled ? "yes" : "no"}
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
                                                <List.Item.Detail.Metadata.Label
                                                    title="Mails replied"
                                                    text={"" + alias.nb_reply}
                                                    icon={Icon.Forward}
                                                />
                                                <List.Item.Detail.Metadata.Label
                                                    title="Mails blocked"
                                                    text={"" + alias.nb_block}
                                                    icon={Icon.Eraser}
                                                />
                                                <List.Item.Detail.Metadata.Separator />
                                                <List.Item.Detail.Metadata.Label title="Contained in mailbox" />
                                                <>
                                                    {alias.mailboxes.length > 0 &&
                                                        alias.mailboxes.map((mailbox) => (
                                                            <List.Item.Detail.Metadata.Label title="E-Mail" text={mailbox.email} />
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
                                            {
                                                alias.pinned
                                                    ? <Action title="Unpinn alias" onAction={() => updatePinnedStatus(alias, false)} icon={Icon.PinDisabled} />
                                                    : <Action title="Pinn alias" onAction={() => updatePinnedStatus(alias, true)} icon={Icon.Pin} />
                                            }
                                        </>
                                        <Action title="Delete alias" onAction={() => deleteAliasPrompt(alias)} icon={Icon.DeleteDocument} shortcut={{ modifiers: ["cmd"], key: "delete" }} />
                                        <Action title={alias.enabled ? 'Disable Alias' : 'enable Alias'} onAction={() => toggleAliasStatePrompt(alias, !alias.enabled)} icon={!alias.enabled ? Icon.Eye : Icon.EyeDisabled} shortcut={{ modifiers: ["cmd"], key: "t" }} />
                                    </ActionPanel>
                                }
                            />
                        );
                    })}
            </>
            <List.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="No alias found" />
        </List>
    );
}
