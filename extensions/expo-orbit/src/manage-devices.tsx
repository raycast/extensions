import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { LaunchForm } from "./components/launch-form";
import { OrbitErrorView } from "./components/orbit-error-view";
import { PairAndroidDeviceForm } from "./components/pair-android-device-form";
import { useDevices } from "./hooks/use-devices";
import { Organization, useOrganization } from "./hooks/use-organization";
import { Device, DeviceList, isStoppable, sortDevices } from "./lib/devices";
import { launchDeviceWithFeedback, stopDeviceWithFeedback } from "./lib/feedback";
import { getOrbitAppPath, OrbitNotInstalledError } from "./lib/orbit";
import {
  getConnectionLabel,
  getDeviceIcon,
  getKindLabel,
  getLaunchTitle,
  getOsLabel,
  getStatusLabel,
  OS_TYPES,
} from "./lib/presentation";

type Filter = "all" | "running" | "physical" | "apple" | "android" | "hidden";
const FILTERS: Filter[] = ["all", "running", "physical", "apple", "android", "hidden"];

function isFilter(value: string): value is Filter {
  return FILTERS.some((filter) => filter === value);
}

function matchesFilter(device: Device, filter: Filter): boolean {
  switch (filter) {
    case "all":
    case "hidden":
      return true;
    case "running":
      return device.isRunning;
    case "physical":
      return device.kind === "device";
    case "apple":
      return device.platform === "ios";
    case "android":
      return device.platform === "android";
  }
}

const HIDE_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "h" };
const DETAILS_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "d" };
const OPEN_BUILD_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd"], key: "i" };

async function openOrbitApp() {
  const appPath = await getOrbitAppPath();
  if (!appPath) {
    await showFailureToast(new OrbitNotInstalledError(), { title: "Couldn't Open Expo Orbit" });
    return;
  }
  await open(appPath);
}

function GeneralActions(props: { onRefresh: () => void }) {
  return (
    <>
      <Action.Push
        title="Pair Android Device"
        icon={Icon.Wifi}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<PairAndroidDeviceForm onPaired={props.onRefresh} />}
      />
      <Action
        title="Refresh Devices"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={props.onRefresh}
      />
      <Action
        title="Open Expo Orbit"
        icon={Icon.AppWindow}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={openOrbitApp}
      />
      <Action title="Choose Platforms" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
}

function DeviceDetail(props: { device: Device }) {
  const { device } = props;
  const connection = getConnectionLabel(device);
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={device.name} icon={getDeviceIcon(device)} />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={getStatusLabel(device)}
              color={device.isRunning ? Color.Green : Color.SecondaryText}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={
              device.kind === "device" ? `Physical ${device.osType} Device` : `${device.osType} ${getKindLabel(device)}`
            }
          />
          {device.osVersion ? <List.Item.Detail.Metadata.Label title="OS" text={getOsLabel(device)} /> : null}
          {device.model ? <List.Item.Detail.Metadata.Label title="Model" text={device.model} /> : null}
          {connection ? <List.Item.Detail.Metadata.Label title="Connection" text={connection} /> : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={device.platform === "ios" ? "UDID" : device.kind === "emulator" ? "AVD Name" : "Device ID"}
            text={device.id}
          />
          {device.serial ? <List.Item.Detail.Metadata.Label title="adb Serial" text={device.serial} /> : null}
          {device.lastBootedAt ? (
            <List.Item.Detail.Metadata.Label
              title="Last Booted"
              text={new Date(device.lastBootedAt).toLocaleString()}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function getAccessories(device: Device, options: { showPhysicalTag: boolean }): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  const connection = getConnectionLabel(device);
  if (device.kind === "device") {
    if (options.showPhysicalTag) {
      accessories.push({ tag: { value: "Physical", color: Color.Blue } });
    }
    accessories.push({
      tag: { value: connection ?? "Connected", color: Color.Blue },
      icon: connection === "Wi-Fi" ? Icon.Wifi : Icon.Plug,
      tooltip: connection ? `Connected over ${connection}` : "Connected",
    });
  } else if (device.isRunning) {
    accessories.push({ tag: { value: "Running", color: Color.Green } });
  }
  return accessories;
}

function OrganizeActions(props: { device: Device; organization: Organization; pinnedCount: number }) {
  const { device, organization } = props;

  if (organization.isHidden(device)) {
    return (
      <Action
        title="Unhide Device"
        icon={Icon.Eye}
        shortcut={HIDE_SHORTCUT}
        onAction={() => organization.unhide(device)}
      />
    );
  }

  const pinIndex = organization.pinIndex(device);
  return (
    <>
      {pinIndex === -1 ? (
        <Action
          title="Pin Device"
          icon={Icon.Pin}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() => organization.pin(device)}
        />
      ) : (
        <Action
          title="Unpin Device"
          icon={Icon.PinDisabled}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() => organization.unpin(device)}
        />
      )}
      {pinIndex > 0 ? (
        <Action
          title="Move up in Pinned"
          icon={Icon.ArrowUp}
          shortcut={Keyboard.Shortcut.Common.MoveUp}
          onAction={() => organization.movePin(device, -1)}
        />
      ) : null}
      {pinIndex !== -1 && pinIndex < props.pinnedCount - 1 ? (
        <Action
          title="Move Down in Pinned"
          icon={Icon.ArrowDown}
          shortcut={Keyboard.Shortcut.Common.MoveDown}
          onAction={() => organization.movePin(device, 1)}
        />
      ) : null}
      <Action
        title="Hide Device"
        icon={Icon.EyeDisabled}
        shortcut={HIDE_SHORTCUT}
        onAction={() => organization.hide(device)}
      />
    </>
  );
}

function DeviceItem(props: {
  device: Device;
  organization: Organization;
  pinnedCount: number;
  showPhysicalTag: boolean;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const { device, isShowingDetail, onRefresh } = props;

  const launchAction =
    device.kind === "device" ? null : (
      <Action
        title={getLaunchTitle(device)}
        icon={device.isRunning ? Icon.Window : Icon.Play}
        onAction={async () => {
          await launchDeviceWithFeedback(device);
          onRefresh();
        }}
      />
    );

  return (
    <List.Item
      title={device.name}
      subtitle={isShowingDetail ? undefined : getOsLabel(device)}
      icon={getDeviceIcon(device)}
      keywords={[
        device.osType,
        getKindLabel(device),
        device.id,
        ...(device.kind === "device" ? ["physical"] : []),
        ...(device.osVersion ? [device.osVersion] : []),
      ]}
      accessories={isShowingDetail ? undefined : getAccessories(device, { showPhysicalTag: props.showPhysicalTag })}
      detail={<DeviceDetail device={device} />}
      actions={
        <ActionPanel title={device.name}>
          <ActionPanel.Section>
            {launchAction}
            <Action.Push
              title="Open Build or Update"
              icon={Icon.Download}
              shortcut={OPEN_BUILD_SHORTCUT}
              target={<LaunchForm device={device} />}
            />
            {isStoppable(device) ? (
              <Action
                title={`Stop ${getKindLabel(device)}`}
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: `Stop ${device.name}?`,
                    message: "Unsaved state in its apps will be lost.",
                    icon: Icon.Stop,
                    primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                  await stopDeviceWithFeedback(device);
                  onRefresh();
                }}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OrganizeActions device={device} organization={props.organization} pinnedCount={props.pinnedCount} />
            <Action
              title={isShowingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={DETAILS_SHORTCUT}
              onAction={props.onToggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={device.platform === "ios" ? "Copy UDID" : "Copy Device ID"}
              content={device.id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Name"
              content={device.name}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <GeneralActions onRefresh={onRefresh} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PlatformErrorItem(props: { error: DeviceList["errors"][number]; onRefresh: () => void }) {
  const { platform, error } = props.error;
  const helper = error.helper;
  return (
    <List.Item
      title={error.message}
      icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      keywords={[platform]}
      actions={
        <ActionPanel>
          {helper?.installUrl ? <Action.OpenInBrowser title={`Get ${helper.label}`} url={helper.installUrl} /> : null}
          {helper?.installCommand ? (
            <Action.CopyToClipboard title="Copy Install Command" content={helper.installCommand} />
          ) : null}
          {helper?.startCommand ? (
            <Action.CopyToClipboard title="Copy Start Command" content={helper.startCommand} />
          ) : null}
          <Action.CopyToClipboard title="Copy Error" content={error.message} />
          <GeneralActions onRefresh={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}

const EMPTY_STATES: Record<Filter, { title: string; description: string }> = {
  all: {
    title: "No Devices",
    description: "Install Xcode simulators or Android emulators, connect a device, or turn on more platforms.",
  },
  running: { title: "No Running Devices", description: "Launch a simulator or emulator, or connect a device." },
  physical: {
    title: "No Physical Devices",
    description: "Connect an iPhone or iPad with a cable, or pair an Android device over Wi-Fi with ⌘N.",
  },
  apple: { title: "No Apple Devices", description: "Install simulators in Xcode, or connect an iPhone or iPad." },
  android: { title: "No Android Devices", description: "Create an emulator in Android Studio, or connect a device." },
  hidden: { title: "No Hidden Devices", description: "Hide devices you rarely use with ⌘⇧H to shorten the list." },
};

export default function Command() {
  const { data, error, isLoading, revalidate } = useDevices();
  const organization = useOrganization();
  const [filter, setFilter] = useCachedState<Filter>("device-filter", "all");
  const [isShowingDetail, setShowingDetail] = useCachedState("show-details", false);

  const onRefresh = () => void revalidate();
  const allDevices = data?.devices ?? [];
  const hiddenCount = allDevices.filter(organization.isHidden).length;
  const showingHidden = filter === "hidden";
  const devices = allDevices.filter(
    (device) => matchesFilter(device, filter) && organization.isHidden(device) === showingHidden,
  );

  const pinned = showingHidden
    ? []
    : devices.filter(organization.isPinned).sort((a, b) => organization.pinIndex(a) - organization.pinIndex(b));
  const unpinned = devices.filter((device) => !organization.isPinned(device) || showingHidden);
  // Physical devices get their own section, so they stand out from the long list of simulators.
  const physical = sortDevices(unpinned.filter((device) => device.kind === "device"));
  const virtual = unpinned.filter((device) => device.kind !== "device");

  const itemProps = {
    organization,
    pinnedCount: organization.pinnedKeys.length,
    isShowingDetail,
    onToggleDetail: () => setShowingDetail(!isShowingDetail),
    onRefresh,
  };

  const errors = (data?.errors ?? []).filter(
    (item) =>
      filter === "all" ||
      (filter === "apple" && item.platform === "iOS") ||
      (filter === "android" && item.platform === "Android"),
  );

  const emptyState = EMPTY_STATES[filter];

  return (
    <List
      isLoading={(isLoading && !data) || organization.isLoading}
      isShowingDetail={isShowingDetail && devices.length > 0 && !error}
      searchBarPlaceholder="Search devices"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Devices"
          value={filter}
          onChange={(value) => {
            if (isFilter(value)) setFilter(value);
          }}
        >
          <List.Dropdown.Item title="All Devices" value="all" icon={Icon.Mobile} />
          <List.Dropdown.Item title="Running Devices" value="running" icon={Icon.Play} />
          <List.Dropdown.Item title="Physical Devices" value="physical" icon={Icon.Plug} />
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Apple Devices" value="apple" />
            <List.Dropdown.Item title="Android Devices" value="android" />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item
              title={hiddenCount > 0 ? `Hidden Devices (${hiddenCount})` : "Hidden Devices"}
              value="hidden"
              icon={Icon.EyeDisabled}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <OrbitErrorView error={error} onRetry={onRefresh} />
      ) : (
        <>
          <List.EmptyView
            icon={showingHidden ? Icon.EyeDisabled : Icon.Mobile}
            title={emptyState.title}
            description={emptyState.description}
            actions={
              <ActionPanel>
                {filter === "all" ? null : (
                  <Action title="Show All Devices" icon={Icon.Mobile} onAction={() => setFilter("all")} />
                )}
                <GeneralActions onRefresh={onRefresh} />
              </ActionPanel>
            }
          />
          {pinned.length > 0 ? (
            <List.Section title="Pinned">
              {pinned.map((device) => (
                <DeviceItem
                  key={`pinned-${device.osType}-${device.id}`}
                  device={device}
                  showPhysicalTag
                  {...itemProps}
                />
              ))}
            </List.Section>
          ) : null}
          {physical.length > 0 ? (
            <List.Section title="Physical Devices">
              {physical.map((device) => (
                <DeviceItem
                  key={`${device.osType}-${device.id}`}
                  device={device}
                  showPhysicalTag={false}
                  {...itemProps}
                />
              ))}
            </List.Section>
          ) : null}
          {OS_TYPES.map((osType) => {
            const section = sortDevices(virtual.filter((device) => device.osType === osType));
            const sectionErrors = showingHidden ? [] : errors.filter((item) => item.platform === osType);
            if (section.length === 0 && sectionErrors.length === 0) return null;
            const running = section.filter((device) => device.isRunning).length;
            const title = osType === "Android" ? "Android Emulators" : `${osType} Simulators`;
            return (
              <List.Section key={osType} title={title} subtitle={running > 0 ? `${running} running` : undefined}>
                {sectionErrors.map((item) => (
                  <PlatformErrorItem key={`${item.platform}-error`} error={item} onRefresh={onRefresh} />
                ))}
                {section.map((device) => (
                  <DeviceItem
                    key={`${device.osType}-${device.id}`}
                    device={device}
                    showPhysicalTag={false}
                    {...itemProps}
                  />
                ))}
              </List.Section>
            );
          })}
        </>
      )}
    </List>
  );
}
