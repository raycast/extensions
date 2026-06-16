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

import type { StarLine } from "../starline/api";
import type { Item } from "../types/devices";

export type DeviceJsonMutationKind =
    | "deviceInfo"
    | "controls"
    | "comfortOptions"
    | "webastoSettings"
    | "remoteStartSettings"
    | "shockSensorSettings"
    | "monitoringSettings";

type DeviceJsonMutationFormProps = {
    item: Item;
    kind: DeviceJsonMutationKind;
    title: string;
    defaultBody?: unknown;
};

type JsonMutationRunner = (starline: StarLine, deviceId: string, body: unknown) => Promise<unknown>;

const JSON_MUTATIONS: Record<DeviceJsonMutationKind, JsonMutationRunner> = {
    deviceInfo: (starline, deviceId, body) => starline.updateDeviceInfo(deviceId, body),
    controls: (starline, deviceId, body) => starline.updateControls(deviceId, body),
    comfortOptions: (starline, deviceId, body) => starline.putComfortOptions(deviceId, body),
    webastoSettings: (starline, deviceId, body) => starline.updateWebastoSettings(deviceId, body),
    remoteStartSettings: (starline, deviceId, body) =>
        starline.updateRemoteStartSettings(deviceId, body),
    shockSensorSettings: (starline, deviceId, body) =>
        starline.updateShockSensorSettings(deviceId, body),
    monitoringSettings: (starline, deviceId, body) =>
        starline.updateMonitoringSettings(deviceId, body),
};

function defaultJson(value: unknown) {
    return JSON.stringify(value ?? {}, null, 4);
}

function parseJsonBody(value: string): { ok: true; body: unknown } | { ok: false } {
    try {
        return { ok: true, body: JSON.parse(value) };
    } catch {
        return { ok: false };
    }
}

function DeviceJsonMutationForm(props: DeviceJsonMutationFormProps) {
    const { item, kind, title, defaultBody = {} } = props;
    const starline = useStarLine();
    const [body, setBody] = useState(defaultJson(defaultBody));

    const submit = async () => {
        const parsedBody = parseJsonBody(body);

        if (!parsedBody.ok) {
            await showToast(Toast.Style.Failure, "Invalid JSON", "Please check request body");
            return;
        }

        const confirmed = await confirmAlert({
            title: `${title}?`,
            message:
                "This will change StarLine device settings. Continue only if you know the expected JSON schema.",
            primaryAction: {
                title: "Submit",
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (!confirmed) {
            return;
        }

        const toast = await showToast(Toast.Style.Animated, title);
        const deviceId = item.device_id.toString();

        try {
            await JSON_MUTATIONS[kind](starline, deviceId, parsedBody.body);

            toast.style = Toast.Style.Success;
            toast.title = "Saved";
            await popToRoot();
        } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to save";
            toast.message = getErrorMessage(error);
        }
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Submit JSON" onSubmit={submit} />
                </ActionPanel>
            }
        >
            <Form.Description
                title={title}
                text="Advanced operation. Edit JSON body according to StarLine API documentation."
            />
            <Form.TextArea id="body" title="Request Body" value={body} onChange={setBody} />
        </Form>
    );
}

export default DeviceJsonMutationForm;
