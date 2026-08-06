import { Action, ActionPanel, Alert, Form, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { useStarLine } from "../context/starline";
import { getErrorMessage } from "../utils/errors";

function DataTransferForm() {
    const starline = useStarLine();
    const [address, setAddress] = useState("");

    useEffect(() => {
        async function load() {
            try {
                await showToast(Toast.Style.Animated, "Loading data transfer address...");
                const data = await starline.getDataTransfer();
                setAddress(data.address ?? "");
                await showToast(Toast.Style.Success, "Loaded");
            } catch (error) {
                await showToast(Toast.Style.Failure, "Failed to load data transfer", getErrorMessage(error));
            }
        }

        void load();
    }, [starline]);

    const handleSubmit = async () => {
        const trimmed = address.trim();

        if (trimmed === "") {
            await showToast(Toast.Style.Failure, "Address is required");
            return;
        }

        let parsed: URL;
        try {
            parsed = new URL(trimmed);
        } catch {
            await showToast(Toast.Style.Failure, "Invalid URL", "Enter a valid http or https URL");
            return;
        }

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            await showToast(Toast.Style.Failure, "Invalid protocol", "Only http: and https: are allowed");
            return;
        }

        try {
            await showToast(Toast.Style.Animated, "Saving data transfer address...");
            await starline.updateDataTransfer({ address: trimmed });
            await showToast(Toast.Style.Success, "Data transfer address saved");
        } catch (error) {
            await showToast(Toast.Style.Failure, "Failed to save", getErrorMessage(error));
        }
    };

    const handleDisable = async () => {
        const confirmed = await confirmAlert({
            title: "Disable Data Transfer?",
            message: "This will remove the current data transfer address.",
            primaryAction: {
                title: "Disable",
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (!confirmed) {
            return;
        }

        try {
            await showToast(Toast.Style.Animated, "Disabling data transfer...");
            await starline.deleteDataTransfer();
            setAddress("");
            await showToast(Toast.Style.Success, "Data transfer disabled");
        } catch (error) {
            await showToast(Toast.Style.Failure, "Failed to disable", getErrorMessage(error));
        }
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Save Address" onSubmit={handleSubmit} />
                    <Action title="Disable Data Transfer" onAction={handleDisable} />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="address"
                title="Data Transfer Address"
                placeholder="https://example.com/data"
                value={address}
                onChange={setAddress}
            />
        </Form>
    );
}

export default DataTransferForm;
