import { Toast, showToast } from "@raycast/api";

import { getErrorMessage } from "./errors";

import type { StarLine } from "../starline/api";
import type { DeviceCommandConfig } from "../starline/commandConfig";
import type { Item } from "../types/devices";

type RunDeviceCommandOptions = Pick<DeviceCommandConfig, "run" | "successMessage" | "title"> & {
    deviceId: string;
    item?: Item;
    starline: StarLine;
};

export async function runDeviceCommand(options: RunDeviceCommandOptions) {
    const { deviceId, item, run, starline, successMessage, title } = options;
    const toast = await showToast(Toast.Style.Animated, title);

    try {
        const result = await run(starline, deviceId, item);
        toast.style = Toast.Style.Success;
        toast.title = successMessage;
        return result;
    } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `${title} failed`;
        toast.message = getErrorMessage(error);
        return undefined;
    }
}
