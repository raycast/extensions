import {
    Action,
    ActionPanel,
    Alert,
    Form,
    Toast,
    confirmAlert,
    popToRoot,
    showToast,
} from "@raycast/api";
import { useState } from "react";

import { useStarLine } from "../context/starline";
import { getErrorMessage } from "../utils/errors";

import type { Item } from "../types/devices";

type HijackCommandFormProps = {
    item: Item;
    enabled: boolean;
};

function HijackCommandForm({ item, enabled }: HijackCommandFormProps) {
    const starline = useStarLine();
    const [pinCode, setPinCode] = useState("");

    const submit = async () => {
        const trimmedPin = pinCode.trim();

        if (trimmedPin.length === 0) {
            await showToast(Toast.Style.Failure, "PIN Required", "Enter the hijack PIN code");
            return;
        }

        const actionLabel = enabled ? "Enable Hijack" : "Disable Hijack";

        const confirmed = await confirmAlert({
            title: `${actionLabel}?`,
            message: enabled
                ? "This will enable hijack protection for the selected device."
                : "This will disable hijack protection for the selected device.",
            primaryAction: {
                title: actionLabel,
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (!confirmed) {
            return;
        }

        const toast = await showToast(Toast.Style.Animated, actionLabel);
        const deviceId = item.device_id.toString();

        try {
            await starline.setHijackMode(deviceId, enabled, trimmedPin);
            toast.style = Toast.Style.Success;
            toast.title = `Hijack ${enabled ? "enabled" : "disabled"}`;
            await popToRoot();
        } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = `${actionLabel} failed`;
            toast.message = getErrorMessage(error);
        }
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title={enabled ? "Enable Hijack" : "Disable Hijack"}
                        onSubmit={submit}
                    />
                </ActionPanel>
            }
        >
            <Form.Description
                title={enabled ? "Enable Hijack Protection" : "Disable Hijack Protection"}
                text="Enter the device PIN code to confirm this operation."
            />
            <Form.PasswordField
                id="pinCode"
                title="PIN Code"
                placeholder="Enter PIN"
                value={pinCode}
                onChange={setPinCode}
            />
        </Form>
    );
}

export default HijackCommandForm;
