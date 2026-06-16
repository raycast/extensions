import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { useStarLine } from "../context/starline";
import { getErrorMessage } from "../utils/errors";
import {
    EMPTY_VALUE,
    displayString,
    enabledDisabledLabel,
    formatUnixTimestamp,
    jsonCodeBlock,
    markdownSection,
    markdownTable,
    statusLabel,
} from "../utils/format";

import type { StarLine } from "../starline/api";
import type { Item } from "../types/devices";
import type {
    ControlsLibraryResponse,
    DeviceEventsResponse,
    DevicePositionResponse,
    DeviceSettingsResponse,
    DeviceStateResponse,
    LibraryEventsResponse,
    ObdErrorsResponse,
    ObdParamsResponse,
} from "../types/starline";
import type { MarkdownRow } from "../utils/format";

export type DeviceApiDetailKind =
    | "controls"
    | "info"
    | "position"
    | "state"
    | "obdParams"
    | "obdErrors"
    | "data"
    | "report"
    | "settings"
    | "comfortOptions"
    | "events"
    | "ways"
    | "drivingScore"
    | "drivingScoreHistory"
    | "eventLibrary";

type DeviceApiDetailProps = {
    item: Item;
    kind: DeviceApiDetailKind;
    title: string;
};

type ApiPeriod = ReturnType<typeof lastHoursPeriod>;
type ApiDetailLoader = (
    starline: StarLine,
    deviceId: string,
    period: ApiPeriod,
) => Promise<unknown>;
type DetailFormatter = (data: unknown) => string;

const DEFAULT_HISTORY_HOURS = 24;
const HISTORY_PERIOD_OPTIONS: Array<{ hours: number; label: string }> = [
    { hours: 1, label: "Last 1h" },
    { hours: 6, label: "Last 6h" },
    { hours: 24, label: "Last 24h" },
    { hours: 24 * 7, label: "Last 7d" },
];
const PERIOD_AWARE_KINDS = new Set<DeviceApiDetailKind>(["events", "ways"]);
const JSON_FORMATTERS = new Set<DeviceApiDetailKind>([
    "info",
    "data",
    "report",
    "comfortOptions",
    "ways",
    "drivingScore",
    "drivingScoreHistory",
]);

const API_DETAIL_LOADERS: Record<DeviceApiDetailKind, ApiDetailLoader> = {
    controls: (api, id) => api.getControlsLibrary(id),
    info: (api, id) => api.getDeviceInfo(id),
    position: (api, id) => api.getPosition(id),
    state: (api, id) => api.getState(id),
    obdParams: (api, id) => api.getObdParams(id),
    obdErrors: (api, id) => api.getObdErrors(id),
    data: (api, id) => api.getDeviceData(id),
    report: (api, id) => api.getDeviceReport(id),
    settings: (api, id) => api.getSettings(id),
    comfortOptions: (api, id) => api.getSupportedComfortOptions(id),
    events: (api, id, { start, end }) =>
        api.getEvents(id, { period_start: start, period_end: end }),
    ways: (api, id, { start, end }) => api.getWays(id, { begin: start, end, split_way: false }),
    drivingScore: (api, id) => api.getDrivingScore(id, {}),
    drivingScoreHistory: (api, id) => api.getDrivingScoreHistory(id, {}),
    eventLibrary: (api) => api.getEventLibrary(),
};

const FORMATTERS: Partial<Record<DeviceApiDetailKind, DetailFormatter>> = {
    controls: (data) => formatControls(data as ControlsLibraryResponse),
    state: (data) => formatState(data as DeviceStateResponse),
    position: (data) => formatPosition(data as DevicePositionResponse),
    events: (data) => formatEvents(data as DeviceEventsResponse),
    obdParams: (data) => formatObdParams(data as ObdParamsResponse),
    obdErrors: (data) => formatObdErrors(data as ObdErrorsResponse),
    settings: (data) => formatSettings(data as DeviceSettingsResponse),
    eventLibrary: (data) => formatEventLibrary(data as LibraryEventsResponse),
};

function formatControls({ controls }: Partial<ControlsLibraryResponse>) {
    const rows = Object.entries(controls ?? {}).map(
        ([command, control]) => [`\`${command}\``, control.title] as MarkdownRow,
    );

    return markdownTable(["Command", "Title"], rows);
}

function formatState({ state }: Partial<DeviceStateResponse>) {
    const stateData = state as Partial<DeviceStateResponse["state"]> | undefined;
    const carState: Partial<DeviceStateResponse["state"]["car_state"]> = stateData?.car_state ?? {};
    const position = stateData?.position;

    return [
        markdownSection("Security", [
            ["Armed", statusLabel(carState.arm, "Armed", "Disarmed")],
            ["Alarm", statusLabel(carState.alarm, "Alarm", "No alarm")],
            ["Service Mode", enabledDisabledLabel(carState.valet)],
            ["Hijack", enabledDisabledLabel(carState.hijack)],
        ]),
        markdownSection("Engine", [
            ["Running", statusLabel(carState.run, "Running", "Stopped")],
            ["Ignition", enabledDisabledLabel(carState.ign)],
            ["Remote Start", enabledDisabledLabel(carState.r_start)],
            ["Webasto", enabledDisabledLabel(carState.webasto)],
        ]),
        markdownSection("Telemetry", [
            ["Battery", displayString(stateData?.battery)],
            ["Cabin Temp", `${displayString(stateData?.ctemp)}°C`],
            ["Engine Temp", `${displayString(stateData?.etemp)}°C`],
            ["GPS Level", displayString(stateData?.gps_lvl)],
            ["GSM Level", displayString(stateData?.gsm_lvl)],
            ["Last Activity", formatUnixTimestamp(stateData?.ts_activity)],
        ]),
        markdownSection("Position", [
            ["X / Lat", displayString(position?.x)],
            ["Y / Lon", displayString(position?.y)],
            ["Timestamp", formatUnixTimestamp(position?.ts)],
        ]),
    ].join("\n\n");
}

function formatPosition({ device }: Partial<DevicePositionResponse>) {
    const position = device?.position ?? {};

    return markdownTable(
        ["Field", "Value"],
        [
            ["Latitude", position.lat],
            ["Longitude", position.lon],
            ["Precision", position.pres === undefined ? EMPTY_VALUE : `${position.pres} m`],
            ["Timestamp", formatUnixTimestamp(position.ts)],
        ],
    );
}

function formatEvents({ events }: Partial<DeviceEventsResponse>) {
    return markdownTable(
        ["Time", "Group", "Type"],
        (events ?? []).map((event) => [
            formatUnixTimestamp(event.timestamp),
            event.groupId,
            event.type,
        ]),
    );
}

function formatObdParams({ obd_params: params, requirements }: ObdParamsResponse) {
    const rows: MarkdownRow[] = [
        [
            "Fuel",
            `${displayString(params?.fuel?.val)} ${params?.fuel?.type ?? ""}`.trim(),
            formatUnixTimestamp(params?.fuel?.ts),
        ],
        ["Errors", displayString(params?.errors?.val), formatUnixTimestamp(params?.errors?.ts)],
        [
            "Mileage",
            `${displayString(params?.mileage?.val)} km`,
            formatUnixTimestamp(params?.mileage?.ts),
        ],
    ];

    return `${markdownTable(["Field", "Value", "Timestamp"], rows)}\n\nMinimum firmware: ${displayString(requirements?.min_version)}`;
}

function formatObdErrors({ obd_errors: errors }: Partial<ObdErrorsResponse>) {
    return markdownTable(
        ["Error", "Time", "Warning", "Description"],
        (errors ?? []).map((error) => [
            error.error,
            formatUnixTimestamp(error.error_ts),
            error.warning_level,
            error.descriptions?.en ?? error.descriptions?.ru,
        ]),
    );
}

function formatSettings(data: Partial<DeviceSettingsResponse>) {
    const { general } = data;

    return `${markdownSection("General", [
        ["Device ID", data.device_id],
        ["Name", general?.name],
        ["Phone", general?.tel],
        ["IMEI", general?.imei],
        ["Firmware", general?.fw_version],
    ])}\n\n## Raw Setting Sections\n\n${jsonCodeBlock({
        webasto: data.webasto,
        monitoring: data.monitoring,
        shock_sens: data.shock_sens,
        remote_start: data.remote_start,
    })}`;
}

function formatEventLibrary({ eventDescriptions }: Partial<LibraryEventsResponse>) {
    return markdownTable(
        ["Code", "Group", "Description"],
        (eventDescriptions ?? []).map(
            (event): MarkdownRow => [event.code, event.group_id, event.desc],
        ),
    );
}

function formatDetail(kind: DeviceApiDetailKind, data: unknown) {
    if (JSON_FORMATTERS.has(kind)) {
        return jsonCodeBlock(data);
    }

    return FORMATTERS[kind]?.(data) ?? jsonCodeBlock(data);
}

function lastHoursPeriod(hours: number) {
    const end = Math.floor(Date.now() / 1000);
    return { start: end - hours * 60 * 60, end };
}

function DeviceApiDetail({ item, kind, title }: DeviceApiDetailProps) {
    const starline = useStarLine();
    const [isLoading, setIsLoading] = useState(true);
    const [markdown, setMarkdown] = useState(`# ${title}\n\nLoading...`);
    const [historyHours, setHistoryHours] = useState(DEFAULT_HISTORY_HOURS);
    const supportsPeriod = PERIOD_AWARE_KINDS.has(kind);

    useEffect(() => {
        async function load() {
            try {
                setIsLoading(true);
                const data = await API_DETAIL_LOADERS[kind](
                    starline,
                    item.device_id.toString(),
                    lastHoursPeriod(historyHours),
                );
                setMarkdown(`# ${title}\n\n${formatDetail(kind, data)}`);
            } catch (error) {
                const message = getErrorMessage(error);
                setMarkdown(`# ${title}\n\nFailed to load data.\n\n${message}`);
                await showToast(Toast.Style.Failure, `Failed to load ${title}`, message);
            } finally {
                setIsLoading(false);
            }
        }

        void load();
    }, [historyHours, item.device_id, kind, starline, title]);

    const actions = supportsPeriod ? (
        <ActionPanel>
            <ActionPanel.Section title="History Period">
                {HISTORY_PERIOD_OPTIONS.map(({ hours, label }) => (
                    <Action
                        key={hours}
                        title={label}
                        onAction={() => {
                            setHistoryHours(hours);
                        }}
                    />
                ))}
            </ActionPanel.Section>
        </ActionPanel>
    ) : undefined;

    return <Detail isLoading={isLoading} markdown={markdown} actions={actions} />;
}

export default DeviceApiDetail;
