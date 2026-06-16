import { Action, ActionPanel, Icon, environment } from "@raycast/api";

import ClearAuthCacheAction from "./actions/ClearAuthCache";
import DefaultDeviceAction from "./actions/DefaultDevice";
import DeviceCommandAction, { ConfiguredDeviceCommandAction } from "./actions/DeviceCommand";
import DeviceApiDetail from "./DeviceApiDetail";
import DeviceDetails from "./DeviceDetails";
import DeviceJsonMutationForm from "./DeviceJsonMutationForm";
import EventDescriptionForm from "./EventDescriptionForm";
import HijackCommandForm from "./HijackCommandForm";
import LbsPositionForm from "./LbsPositionForm";
import { useSelectedDeviceItem } from "./context/deviceItem";
import {
    ADVANCED_DEVICE_ACTIONS,
    ADVANCED_DEVICE_ACTION_KEYS,
    PRIMARY_DEVICE_ACTIONS,
} from "../starline/commandConfig";
import { isCommandSupported } from "../starline/commandSupport";

import type { DeviceApiDetailKind } from "./DeviceApiDetail";
import type { DeviceJsonMutationKind } from "./DeviceJsonMutationForm";

type PanelItem<TKind extends string> = { title: string; kind: TKind; icon: Icon };

const DEVICE_DETAIL_ACTIONS: Array<PanelItem<DeviceApiDetailKind>> = [
    { title: "Supported Controls", kind: "controls", icon: Icon.List },
    { title: "Live State", kind: "state", icon: Icon.Heartbeat },
    { title: "Position", kind: "position", icon: Icon.Map },
    { title: "Device Info", kind: "info", icon: Icon.Info },
    { title: "Full Device Data", kind: "data", icon: Icon.Document },
    { title: "Summary Report", kind: "report", icon: Icon.BarChart },
    { title: "Settings", kind: "settings", icon: Icon.Gear },
    { title: "Comfort Options", kind: "comfortOptions", icon: Icon.Window },
    { title: "Events / Last 24h", kind: "events", icon: Icon.Clock },
    { title: "Track / Last 24h", kind: "ways", icon: Icon.Map },
    { title: "Driving Score", kind: "drivingScore", icon: Icon.BarChart },
    { title: "Driving Score History", kind: "drivingScoreHistory", icon: Icon.BarChart },
    { title: "OBD Params", kind: "obdParams", icon: Icon.Gauge },
    { title: "OBD Errors", kind: "obdErrors", icon: Icon.ExclamationMark },
    { title: "Event Library", kind: "eventLibrary", icon: Icon.Book },
];

const JSON_FORM_ACTIONS: Array<PanelItem<DeviceJsonMutationKind>> = [
    { title: "Update Device Info", kind: "deviceInfo", icon: Icon.Pencil },
    { title: "Update Controls", kind: "controls", icon: Icon.List },
    { title: "Put Comfort Options", kind: "comfortOptions", icon: Icon.Window },
    { title: "Update Webasto Settings", kind: "webastoSettings", icon: Icon.Gear },
    { title: "Update Remote Start Settings", kind: "remoteStartSettings", icon: Icon.Gear },
    { title: "Update Shock Sensor Settings", kind: "shockSensorSettings", icon: Icon.Gear },
    { title: "Update Monitoring Settings", kind: "monitoringSettings", icon: Icon.Gear },
];

function DetailActions({ items }: { items: Array<PanelItem<DeviceApiDetailKind>> }) {
    const item = useSelectedDeviceItem();

    return items.map(({ title, kind, icon }) => (
        <Action.Push
            key={kind}
            title={`Show ${title}`}
            icon={icon}
            target={<DeviceApiDetail item={item} kind={kind} title={title} />}
        />
    ));
}

function JsonFormActions({ items }: { items: Array<PanelItem<DeviceJsonMutationKind>> }) {
    const item = useSelectedDeviceItem();
    const deviceInfoBody = { alias: item.alias, phone: item.phone };

    return items.map(({ title, kind, icon }) => (
        <Action.Push
            key={kind}
            title={title}
            icon={icon}
            target={
                <DeviceJsonMutationForm
                    item={item}
                    kind={kind}
                    title={title}
                    defaultBody={kind === "deviceInfo" ? deviceInfoBody : undefined}
                />
            }
        />
    ));
}

function DevicesItemActionPanel({ showDetailsAction = true }: { showDetailsAction?: boolean }) {
    const item = useSelectedDeviceItem();

    return (
        <ActionPanel>
            <ActionPanel.Section>
                {showDetailsAction && (
                    <Action.Push title="Show Details" target={<DeviceDetails item={item} />} />
                )}
                {PRIMARY_DEVICE_ACTIONS.map((command) => (
                    <ConfiguredDeviceCommandAction key={command} command={command} />
                ))}
                <DefaultDeviceAction isDefault={item.default === true} />
            </ActionPanel.Section>

            <ActionPanel.Section title="Device Data">
                <DetailActions items={DEVICE_DETAIL_ACTIONS} />
                <Action.Push
                    title="Show Event Description"
                    icon={Icon.MagnifyingGlass}
                    target={<EventDescriptionForm />}
                />
                <Action.Push
                    title="Get LBS Position"
                    icon={Icon.Map}
                    target={<LbsPositionForm />}
                />
            </ActionPanel.Section>

            {environment.isDevelopment && (
                <ActionPanel.Section title="Settings / Advanced JSON Forms">
                    <JsonFormActions items={JSON_FORM_ACTIONS} />
                </ActionPanel.Section>
            )}

            <ActionPanel.Section title="Advanced Commands">
                {isCommandSupported("hijack", item) && (
                    <>
                        <Action.Push
                            title="Enable Hijack…"
                            icon={Icon.ExclamationMark}
                            target={<HijackCommandForm item={item} enabled />}
                        />
                        <Action.Push
                            title="Disable Hijack…"
                            icon={Icon.ExclamationMark}
                            target={<HijackCommandForm item={item} enabled={false} />}
                        />
                    </>
                )}
                {ADVANCED_DEVICE_ACTION_KEYS.map((command) => (
                    <DeviceCommandAction key={command} {...ADVANCED_DEVICE_ACTIONS[command]} />
                ))}
            </ActionPanel.Section>

            {environment.isDevelopment && (
                <ActionPanel.Section title="Development">
                    <Action.CopyToClipboard
                        title="Copy Item UUID"
                        content={item.device_id.toString()}
                    />
                    <ClearAuthCacheAction />
                </ActionPanel.Section>
            )}
        </ActionPanel>
    );
}

export default DevicesItemActionPanel;
