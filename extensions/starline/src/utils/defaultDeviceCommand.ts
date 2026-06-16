import { LocalStorage, Toast, showToast } from "@raycast/api";

import { StarLine } from "../starline/api";
import { DEVICE_ACTIONS } from "../starline/commandConfig";
import { LOCAL_STORAGE } from "../starline/constants";

import { confirmDeviceCommand } from "./confirmCommand";
import { runDeviceCommand } from "./runDeviceCommand";

import type { DeviceActionKey } from "../starline/commandConfig";

export const createDefaultDeviceCommand = (command: DeviceActionKey) => () =>
    defaultDeviceCommand(command);

export default async function defaultDeviceCommand(command: DeviceActionKey) {
    const deviceId = await LocalStorage.getItem(LOCAL_STORAGE.DEFAULT_DEVICE);

    if (deviceId === undefined) {
        await showToast(
            Toast.Style.Failure,
            "No default device",
            "Please set default device first",
        );
        return;
    }

    const config = DEVICE_ACTIONS[command];

    if (!(await confirmDeviceCommand(config.confirmation, config.title))) {
        return;
    }

    await runDeviceCommand({
        ...config,
        deviceId: deviceId.toString(),
        starline: new StarLine(),
    });
}
