import { Alert, confirmAlert } from "@raycast/api";

import type { DeviceCommandConfig } from "../starline/commandConfig";

export const confirmDeviceCommand = (
    confirmation: DeviceCommandConfig["confirmation"],
    fallbackTitle: string,
) =>
    confirmation === undefined ||
    confirmAlert({
        title: confirmation.title,
        message: confirmation.message,
        primaryAction: {
            title: confirmation.primaryActionTitle ?? fallbackTitle,
            style: confirmation.style ?? Alert.ActionStyle.Default,
        },
    });
