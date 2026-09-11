import { Detail } from "@raycast/api";

import {
    EMPTY_VALUE,
    deviceTitle,
    displayString,
    enabledDisabledLabel,
    formatUnixTimestamp,
    hasText,
    markdownSection,
    openClosedLabel,
    statusLabel,
} from "../utils/format";

import type { Item } from "../types/devices";
type DeviceDetailsProps = {
    item: Item;
};

function DeviceDetails({ item }: DeviceDetailsProps) {
    const title = deviceTitle(item);
    const markdown = [
        `# ${title}`,
        markdownSection("State", [
            ["Armed", statusLabel(item.car_state.arm, "Armed", "Disarmed")],
            ["Alarm", statusLabel(item.car_state.alarm, "Alarm", "No alarm")],
            ["Engine", statusLabel(item.car_state.run, "Running", "Stopped")],
            ["Ignition", enabledDisabledLabel(item.car_state.ign)],
            ["Service mode", enabledDisabledLabel(item.car_state.valet)],
            ["Webasto", enabledDisabledLabel(item.car_state.webasto)],
            ["Hands free", item.functions?.includes("hfree") === true ? "Supported" : EMPTY_VALUE],
        ]),
        markdownSection("Sensors", [
            ["Door", openClosedLabel(item.car_state.door)],
            ["Hood", openClosedLabel(item.car_state.hood)],
            ["Trunk", openClosedLabel(item.car_state.trunk)],
            ["Handbrake", statusLabel(item.car_state.hbrake, "Engaged", "Released")],
            ["Shock sensor bypass", enabledDisabledLabel(item.car_state.shock_bpass)],
            ["Tilt sensor bypass", enabledDisabledLabel(item.car_state.tilt_bpass)],
            ["Additional sensor bypass", enabledDisabledLabel(item.car_state.add_sens_bpass)],
        ]),
        markdownSection("Telemetry", [
            ["Cabin temperature", `${item.ctemp}°C`],
            ["Engine temperature", `${item.etemp}°C`],
            ["Battery", displayString(item.battery)],
            ["GSM level", displayString(item.gsm_lvl)],
            ["Balance", `${displayString(item.balance?.active.value)} ${item.balance?.active.currency ?? ""}`.trim()],
            ["Last activity", formatUnixTimestamp(item.ts_activity)],
        ]),
        markdownSection("Position", [
            ["Latitude / X", displayString(item.position?.x)],
            ["Longitude / Y", displayString(item.position?.y)],
            ["Radius", displayString(item.position?.r)],
            ["Timestamp", formatUnixTimestamp(item.position?.ts)],
        ]),
        markdownSection("Device", [
            ["ID", item.device_id],
            ["IMEI", displayString(item.imei)],
            ["Serial", displayString(item.sn)],
            ["Phone", displayString(item.phone)],
            ["Type", displayString(hasText(item.typename) ? item.typename : item.type)],
            ["Firmware", displayString(item.fw_version)],
        ]),
    ].join("\n\n");

    return <Detail markdown={markdown} />;
}

export default DeviceDetails;
