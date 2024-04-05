import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { nameLocalStorageKey } from "./utils";

interface StorageValues {
    key: string;
    value: any;
}

export default function Command() {
    const [loadingStoredItems, setLoadingStoredItems] = useState(true);
    const [storedItems, setStoredItems] = useState([] as [string, StorageValues][]);

    useEffect(() => {
        LocalStorage.allItems<StorageValues>().then((items) => {
            setLoadingStoredItems(false);
            setStoredItems(Object.entries(items));
        });
    }, []);

    return (
        <Form
            isLoading={loadingStoredItems}
            actions={
                <ActionPanel>
                    <SavePreferencesAction />
                    <ClearPreferencesAction />
                </ActionPanel>
            }
        >
            <Form.TextArea id="name" title="Name" placeholder="Name to use at the start of your accounts, e.g. zac" />
            <Form.Description
                title="Preferences"
                text={`This is a list of all stored preferences.\n\nUse ⌘ + k to open the action menu to clear all values.\n${(storedItems).map((item) => item[0] + ": " + item[1]).join("\n")}`}
            />
        </Form>
    );
}

function SavePreferencesAction() {
    async function handleSubmit(values: { name: string }) {
        const name = values.name;
       
        // name shouldn't be empty
        if (!name) {
            showToast({
                style: Toast.Style.Failure,
                title: "Name is required",
            });
            return;
        }
        
        // name should contain only letters
        if (!/^[a-zA-Z]+$/.test(name)) {
            showToast({
                style: Toast.Style.Failure,
                title: "Invalid name",
                message: "Name should contain only letters",
            });
            return;
        }

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Saving name",
        });

        try {
            await LocalStorage.setItem(nameLocalStorageKey(), name.toLowerCase());
            toast.style = Toast.Style.Success;
            toast.title = "Saved name";
            toast.message = "Set name in preferences";
        } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed saving name";
            toast.message = String(error);
        }
    }

    return <Action.SubmitForm icon={Icon.Upload} title="Save Name" onSubmit={handleSubmit} />;
}

function ClearPreferencesAction() {
    return <Action.SubmitForm icon={Icon.Eraser} title="Clear All Preferences" onSubmit={() => LocalStorage.clear()} />;
}