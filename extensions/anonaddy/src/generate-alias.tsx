import { Action, ActionPanel, Clipboard, closeMainWindow, List, Icon, confirmAlert, showHUD, Form } from "@raycast/api";
import { useEffect, useState } from "react";
import { createAlias } from "./utils/create";
import { deleteAlias } from "./utils/delete";

const GenerateAlias = () => {
    const [newEmail, setNewEmail] = useState("");
    const [newAliasId, setNewAliasId] = useState("");

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        const newAliasEmail = await createAlias();

        setNewEmail(newAliasEmail.email);
        setNewAliasId(newAliasEmail.id);
    };

    return (
        <>
            <List enableFiltering={false}>
                <List.Item
                    title={newEmail || "Generating alias..."}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Copy to Clipboard"
                                onAction={() => {
                                    Clipboard.copy(newEmail);
                                    closeMainWindow();
                                    showHUD("Alias copied");
                                }}
                                icon={Icon.Clipboard}
                            />
                            <Action
                                title="Delete Alias"
                                onAction={async () => {
                                    const choice = await confirmAlert({
                                        title: "Delete alias?",
                                        message: "You can restore the alias in the dashboard.",
                                    });

                                    if (choice) {
                                        const success = await deleteAlias(newAliasId);

                                        if (success) {
                                            showHUD("Alias deleted");
                                        }
                                    }
                                }}
                                icon={Icon.Trash}
                            />
                        </ActionPanel>
                    }
                    icon={Icon.Envelope}
                />
            </List>
        </>
    );
};

export default GenerateAlias;
