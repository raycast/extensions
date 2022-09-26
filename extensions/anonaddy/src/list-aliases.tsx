import { Action, ActionPanel, Clipboard, closeMainWindow, confirmAlert, Icon, List, showHUD } from "@raycast/api";

import { useEffect, useState } from "react";
import { deleteAlias } from "./utils/delete";
import { aliasObject, listAllAliases } from "./utils/list";
import { toggleAlias } from "./utils/toggle";

const ListAliases = () => {
    const [aliases, setAliases] = useState<aliasObject[]>([]);

    const [loading, setLoading] = useState(true);

    const [searchText, setSearchText] = useState("");
    const [filteredList, filterList] = useState<aliasObject[]>([]);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        const allAliases = await listAllAliases();

        setLoading(false);

        setAliases(allAliases);
        filterList(allAliases);
    };

    useEffect(() => {
        if (loading) return;
        if (!searchText) return filterList(aliases);
        if (!aliases) return;

        filterList(
            aliases.filter(
                (alias) =>
                    alias.email.toLowerCase().includes(searchText.toLowerCase()) ||
                    alias.description?.includes(searchText.toLowerCase())
            )
        );
    }, [searchText]);

    return (
        <>
            <List
                enableFiltering={false}
                searchBarPlaceholder="Search emails and descriptions"
                navigationTitle="Search AnonAddy"
                onSearchTextChange={setSearchText}
            >
                {filteredList.map((alias) => (
                    <List.Item
                        key={alias.id}
                        title={alias.email}
                        subtitle={alias.description || "-"}
                        icon={alias.active ? Icon.Envelope : Icon.LightBulbOff}
                        actions={
                            <ActionPanel>
                                <Action
                                    title="Copy to Clipboard"
                                    onAction={() => {
                                        Clipboard.copy(alias.email);
                                        closeMainWindow();
                                        showHUD("Alias copied");
                                    }}
                                    icon={Icon.Clipboard}
                                />
                                {!alias.active ? (
                                    <Action
                                        title="Activate"
                                        onAction={async () => {
                                            const success = await toggleAlias(alias.id, true);

                                            if (success) {
                                                showHUD("Alias activated");
                                            } else {
                                                showHUD("Error activating alias");
                                            }
                                        }}
                                        icon={Icon.Checkmark}
                                    />
                                ) : (
                                    <Action
                                        title="Deactivate"
                                        onAction={async () => {
                                            const success = await toggleAlias(alias.id, false);

                                            if (success) {
                                                showHUD("Alias deactivated");
                                            } else {
                                                showHUD("Error deactivating alias");
                                            }
                                        }}
                                        icon={Icon.XMarkCircle}
                                    />
                                )}
                                <Action
                                    title="Delete Alias"
                                    onAction={async () => {
                                        const choice = await confirmAlert({
                                            title: "Delete alias?",
                                            message: "You can restore the alias in the dashboard.",
                                        });

                                        if (choice) {
                                            const success = await deleteAlias(alias.id);

                                            if (success) {
                                                showHUD("Alias deleted");
                                            } else {
                                                showHUD("Error deleting alias");
                                            }
                                        }
                                    }}
                                    icon={Icon.Trash}
                                />
                            </ActionPanel>
                        }
                    />
                ))}
                {loading && <List.Item title="Loading..." icon={Icon.MagnifyingGlass} />}
            </List>
        </>
    );
};

export default ListAliases;
