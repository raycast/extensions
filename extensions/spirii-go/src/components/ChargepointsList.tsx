import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { locationDetailUrl } from "../api";
import { Location, LocationDetail } from "../types";
import { formatConnector, statusColor, statusText } from "../utils";
import PriceSchedule from "./PriceSchedule";

type Props = { location: Location };

export default function ChargepointsList({ location }: Props) {
  const { data, isLoading, error, revalidate } = useFetch<LocationDetail>(
    locationDetailUrl(location.id),
    { keepPreviousData: true },
  );

  useEffect(() => {
    if (error)
      showFailureToast(error, { title: "Could not load chargepoints" });
  }, [error]);

  if (error && !data) {
    return (
      <List navigationTitle={location.name}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load chargepoints"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={location.name}
      searchBarPlaceholder="Search chargepoints…"
    >
      {(data?.evse ?? []).map((evse) => (
        <List.Item
          key={evse.id}
          icon={{ source: Icon.Plug, tintColor: statusColor(evse.status) }}
          title={evse.id}
          subtitle={`${formatConnector(evse.type)} · ${evse.maxPower} kW`}
          accessories={[
            ...(evse.pricing
              ? [
                  {
                    text: `${evse.pricing.amount.toFixed(2)} ${evse.pricing.currency}/${evse.pricing.unit}`,
                  },
                ]
              : []),
            {
              tag: {
                value: statusText(evse.status),
                color: statusColor(evse.status),
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Price Schedule"
                icon={Icon.BarChart}
                target={
                  <PriceSchedule
                    evseId={evse.id}
                    statusOverride={evse.status}
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Chargepoint ID"
                content={evse.id}
              />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={() => revalidate()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (data?.evse?.length ?? 0) === 0 && (
        <List.EmptyView
          icon={Icon.Info}
          title="No chargepoints"
          description="This location has no chargepoints listed."
        />
      )}
    </List>
  );
}
