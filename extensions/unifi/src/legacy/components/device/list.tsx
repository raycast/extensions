import { ActionPanel, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Site, tDevice } from "unifi-client";
import { showErrorToast } from "../../utils";
import { RevalidateAction, ToggleDetailsAction } from "../actions";
import { deviceStateToString } from "./utils";
import { CopyDeviceIPAction, CopyDeviceMacAddressAction } from "./actions";
import { useEffect } from "react";

function DeviceListItem(props: {
  device: tDevice;
  showDetails?: boolean;
  setShowDetails?: (newValue: boolean) => void;
  revalidate: () => void;
}) {
  const d = props.device;
  const keywords = [d.ip, d.mac, d.model, d.deviceId].filter((e) => e && e.length > 0) as string[];
  return (
    <List.Item
      key={d._id}
      title={d.name || "?"}
      icon="unifi.png"
      keywords={keywords.length > 0 ? keywords : undefined}
      detail={
        props.showDetails === true && (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Name" text={d.name || "-"} />
                <List.Item.Detail.Metadata.Label title="IP Address" text={d.ip} />
                <List.Item.Detail.Metadata.Label title="MAC Address" text={d.mac} />
                <List.Item.Detail.Metadata.Label title="Status" text={deviceStateToString(d.state)} />
                <List.Item.Detail.Metadata.Label title="Device Version" text={d.version} />
                <List.Item.Detail.Metadata.Label title="Device ID" text={d.deviceId} />
                <List.Item.Detail.Metadata.Label title="Model" text={d.model} />
                <List.Item.Detail.Metadata.Label title="Network" text={d.connectionNetworkName} />
              </List.Item.Detail.Metadata>
            }
          />
        )
      }
      accessories={[{ tag: !props.showDetails ? deviceStateToString(d.state) : "" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ToggleDetailsAction showDetails={props.showDetails} setShowDetails={props.setShowDetails} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyDeviceIPAction device={d} />
            <CopyDeviceMacAddressAction device={d} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RevalidateAction revalidate={props.revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function SiteDevicesList(props: { site: Site }) {
  const [showDetails, setShowDetails] = useCachedState("show-details", true, { cacheNamespace: "devices" });
  const {
    data: clients,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (site: Site) => {
      const clients = await site.devices.list();
      return clients;
    },
    [props.site],
    { keepPreviousData: true },
  );

  useEffect(() => {
    if (error) {
      showErrorToast(error);
    }
  }, [error]);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetails}>
      <List.Section title="Devices" subtitle={`${clients?.length}`}>
        {clients?.map((d) => (
          <DeviceListItem
            key={d._id}
            device={d}
            showDetails={showDetails}
            setShowDetails={setShowDetails}
            revalidate={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}
