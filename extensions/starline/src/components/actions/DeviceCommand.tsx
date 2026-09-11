import { Action } from "@raycast/api";
import { useMemo } from "react";

import { useOptionalDevicesContext } from "../../context/devices";
import { useOptionalStarLine } from "../../context/starline";
import { StarLine } from "../../starline/api";
import { DEVICE_ACTIONS } from "../../starline/commandConfig";
import { isCommandSupported } from "../../starline/commandSupport";
import { confirmDeviceCommand } from "../../utils/confirmCommand";
import { runDeviceCommand } from "../../utils/runDeviceCommand";
import { useSelectedDeviceItem } from "../context/deviceItem";

import type { DeviceActionKey, DeviceCommandConfig } from "../../starline/commandConfig";
import type { CarStatus, Item } from "../../types/devices";

const updateArmState = (target: Item, result: CarStatus) => {
    const isArmed = result.arm === "1";
    return (device: Item) =>
        device.device_id === target.device_id
            ? { ...device, car_state: { ...device.car_state, arm: isArmed } }
            : device;
};

function DeviceCommandAction(config: DeviceCommandConfig) {
    const { title, icon, shortcut, confirmation, run, successMessage, supportCommand, updatesArmState } = config;
    const item = useSelectedDeviceItem();
    const devicesContext = useOptionalDevicesContext();
    const contextStarLine = useOptionalStarLine();
    const fallbackStarLine = useMemo(() => new StarLine(), []);
    const starline = contextStarLine ?? fallbackStarLine;

    if (!isCommandSupported(supportCommand, item)) {
        return null;
    }

    const handleAction = async () => {
        if (!(await confirmDeviceCommand(confirmation, title))) {
            return;
        }

        const result = await runDeviceCommand({
            deviceId: item.device_id.toString(),
            item,
            run,
            starline,
            successMessage,
            title,
        });

        if (updatesArmState !== true || devicesContext === null || result === undefined) {
            return;
        }

        devicesContext.updateState(({ devices }) => ({
            devices: devices.map(updateArmState(item, result as CarStatus)),
            isLoading: false,
        }));
    };

    return <Action title={title} icon={icon} shortcut={shortcut} onAction={handleAction} />;
}

export function ConfiguredDeviceCommandAction({ command }: { command: DeviceActionKey }) {
    return <DeviceCommandAction {...DEVICE_ACTIONS[command]} />;
}

export default DeviceCommandAction;
