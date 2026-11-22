import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import { useDevices } from "../hooks/use-devices";
import type { Phone, PhoneOverview } from "../lib/types";
import { canControl, deviceStatus, lockStatus, markdownText, setupStep } from "../utils/device-status";
import { ErrorView, SetupActions } from "./Setup";

export function DeviceList({
  actions,
}: {
  actions: (phone: Phone, overview: PhoneOverview, enabled: boolean) => ReactNode;
}) {
  const { data, error, isLoading, refresh } = useDevices();
  if (error) return <ErrorView error={error} retry={refresh} />;
  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search connected iPhones…">
      <List.EmptyView
        title={isLoading ? "Looking for iPhones…" : "Connect an iPhone"}
        description="Connect a physical iPhone by USB, then run ghosthand setup in Terminal."
        icon={Icon.Mobile}
        actions={
          <ActionPanel>
            <Action title="Refresh Devices" onAction={refresh} icon={Icon.ArrowClockwise} />
            <SetupActions />
          </ActionPanel>
        }
      />
      {data?.phones.map((phone) => (
        <List.Item
          key={phone.id}
          title={phone.name}
          subtitle={`${phone.modelName ?? phone.model ?? "iPhone"} · ${phone.id.slice(-6)}`}
          icon={{
            source: Icon.Mobile,
            tintColor: phone.lease ? Color.Orange : canControl(phone, data) ? Color.Green : Color.SecondaryText,
          }}
          detail={
            <List.Item.Detail
              markdown={`## ${markdownText(phone.name)}\n\n${markdownText(setupStep(phone))}${phone.xctest?.error ? `\n\n${markdownText(phone.xctest.error)}` : ""}${phone.lease ? `\n\n**In use by ${markdownText(phone.lease.label ?? "another client")}**\n\n${markdownText(phone.lease.reason)}` : ""}${data.account.state !== "signed-in" ? "\n\nSign in through `ghosthand setup` before controlling this iPhone." : ""}${data.camera !== "authorized" ? "\n\nAllow Camera access in Ghosthand setup to enable screen capture." : ""}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Status" text={deviceStatus(phone)} />
                  <List.Item.Detail.Metadata.Label title="Model" text={phone.modelName ?? phone.model ?? "Unknown"} />
                  <List.Item.Detail.Metadata.Label title="iOS" text={phone.iosVersion ?? "Unknown"} />
                  <List.Item.Detail.Metadata.Label title="Host Mac" text={data.macName} />
                  <List.Item.Detail.Metadata.Label
                    title="USB"
                    text={phone.captureId ? "Connected · Capture available" : "Connected · Capture unavailable"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Bluetooth"
                    text={phone.bluetooth?.state ?? data.bluetooth.state}
                  />
                  <List.Item.Detail.Metadata.Label title="Lock State" text={lockStatus(phone)} />
                  <List.Item.Detail.Metadata.Label title="Input Mode" text={phone.control} />
                  {phone.lease && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Lease Holder"
                        text={phone.lease.label ?? "Another client"}
                      />
                      <List.Item.Detail.Metadata.Label title="Last Command" text={phone.lease.lastCommand ?? "None"} />
                      <List.Item.Detail.Metadata.Label
                        title="Idle Expiry"
                        text={new Date(phone.lease.expiresAt).toLocaleString()}
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {actions(phone, data, canControl(phone, data))}
              <Action title="Refresh Devices" icon={Icon.ArrowClockwise} onAction={refresh} />
              <SetupActions />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
