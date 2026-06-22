import { Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { useStarLine } from "../context/starline";
import { getErrorMessage } from "../utils/errors";
import { displayString, formatUnixTimestamp, jsonCodeBlock, markdownTable } from "../utils/format";

import type { StarLine } from "../starline/api";
import type { DeviceListResponse, MobileDevicesResponse, UserDevicesResponse } from "../types/starline";
import type { MarkdownRow } from "../utils/format";

type AccountApiDetailKind = "userDevices" | "deviceList" | "mobileDevices";

type AccountApiDetailProps = {
    kind: AccountApiDetailKind;
    title: string;
};

type ApiLoader = (api: StarLine) => Promise<unknown>;

const LOADERS: Record<AccountApiDetailKind, ApiLoader> = {
    userDevices: (api) => api.getUserDevices(),
    deviceList: (api) => api.getDeviceList(),
    mobileDevices: (api) => api.getMobileDevices(),
};

function binaryFlag(value: "0" | "1" | undefined): string {
    if (value === "1") {
        return "Yes";
    }
    if (value === "0") {
        return "No";
    }
    return displayString(value);
}

function formatUserDevices(data: unknown): string {
    const { devices = [] } = data as Partial<UserDevicesResponse>;
    const rows: MarkdownRow[] = devices.map((d) => [
        displayString(d.device_id),
        displayString(d.name),
        binaryFlag(d.online),
        binaryFlag(d.has_alarms),
        displayString(d.activity),
    ]);
    return markdownTable(["ID", "Name", "Online", "Alarm", "Activity"], rows);
}

function formatDeviceList(data: unknown): string {
    const { data: inner } = data as Partial<DeviceListResponse>;
    const devices = inner?.devices ?? [];
    const rows: MarkdownRow[] = devices.map((d) => [
        displayString(d.device_id),
        displayString(d.alias),
        displayString(d.status),
        displayString(d.pos?.x),
        displayString(d.pos?.y),
        formatUnixTimestamp(d.pos?.ts),
        displayString(d.roles?.join(", ")),
    ]);
    return markdownTable(["ID", "Alias", "Status", "Lon", "Lat", "Position Time", "Roles"], rows);
}

function formatMobileDevices(data: unknown): string {
    const { mobiles = [] } = data as Partial<MobileDevicesResponse>;
    const rows: MarkdownRow[] = mobiles.map((m) => [
        displayString(m.model),
        displayString(m.os_type),
        displayString(m.os_version),
        displayString(m.app_version),
        displayString(m.language),
    ]);
    return markdownTable(["Model", "OS", "OS Version", "App", "Language"], rows);
}

const FORMATTERS: Record<AccountApiDetailKind, (data: unknown) => string> = {
    userDevices: formatUserDevices,
    deviceList: formatDeviceList,
    mobileDevices: formatMobileDevices,
};

function AccountApiDetail({ kind, title }: AccountApiDetailProps) {
    const starline = useStarLine();
    const [isLoading, setIsLoading] = useState(true);
    const [markdown, setMarkdown] = useState(`# ${title}\n\nLoading...`);

    useEffect(() => {
        async function load() {
            try {
                setIsLoading(true);
                const data = await LOADERS[kind](starline);
                const formatted = FORMATTERS[kind](data);
                setMarkdown(`# ${title}\n\n${formatted}\n\n## Raw JSON\n\n${jsonCodeBlock(data)}`);
            } catch (error) {
                const message = getErrorMessage(error);
                setMarkdown(`# ${title}\n\nFailed to load data.\n\n${message}`);
                await showToast(Toast.Style.Failure, `Failed to load ${title}`, message);
            } finally {
                setIsLoading(false);
            }
        }

        void load();
    }, [kind, starline, title]);

    return <Detail isLoading={isLoading} markdown={markdown} />;
}

export default AccountApiDetail;
