import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert, Color, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { Authors } from "./types";
import { cache, getAuthorsArrFromCache, KEY, removeAuthorFromCache } from "./utils";
import CreateOrEditCoAuthor from "./create-or-edit-co-author";

export default function ManageCoAuthors() {
    const [authors, setAuthors] = useState<Authors>(getAuthorsArrFromCache());
    useEffect(() => {
        return cache.subscribe((key, data) => {
            if (key === KEY && data) {
                setAuthors(JSON.parse(data));
            }
        });
    }, []);

    return (
        <List searchBarPlaceholder="Manage a Co-Author...">
            {authors.map((author) => (
                <List.Item
                    title={author.name}
                    subtitle={author.email}
                    key={author.email}
                    actions={
                        <ActionPanel>
                            <Action.Push
                                title={`Edit ${author.name}`}
                                target={<CreateOrEditCoAuthor author={author} fromSelect={false}/>}
                                icon={Icon.Pencil}
                            />
                            <Action
                                title={`Remove ${author.name}`}
                                icon={Icon.RemovePerson}
                                style={Action.Style.Destructive}
                                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                                onAction={async () => {
                                    await confirmAlert({
                                        title: "Remove Author",
                                        message: `Are you sure you want to remove ${author.name}?`,
                                        icon: { source: Icon.RemovePerson, tintColor: Color.Red },
                                        primaryAction: {
                                            title: "Remove",
                                            style: Alert.ActionStyle.Destructive,
                                            onAction: () => {
                                                removeAuthorFromCache(author.email);
                                                showToast(Toast.Style.Success, `Removed ${author.name}`);
                                            },
                                        },
                                    });
                                }}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}