import { Action, Clipboard, Color, Icon, Image, List } from "@raycast/api";
import { ReactNode } from "react";
import { DevicesMap } from "src/core/devices/constants/specifications";
import { DeviceBatteryLevels } from "./devices.types";
import { disconnectDevice } from "src/core/devices/handlers/disconnect-device";
import { connectDevice } from "./handlers/connect-device";

export class Device {
  name: string;
  icon: Image;
  type: string | undefined;
  macAddress: string;
  connected: boolean;
  batteryLevels: DeviceBatteryLevels;
  productId: string | undefined;
  vendorId: string | undefined;
  actions: ReactNode[];
  accessories: List.Item.Accessory[];
  rawDeviceData: object;

  constructor(data: {
    name: string;
    icon: Image;
    type: string | undefined;
    macAddress: string;
    connected: boolean;
    batteryLevels: DeviceBatteryLevels;
    productId: string | undefined;
    vendorId: string | undefined;
    actions: ReactNode[];
    accessories: List.Item.Accessory[];
    rawDeviceData: object;
  }) {
    this.name = data.name;
    this.icon = data.icon;
    this.type = data.type;
    this.macAddress = data.macAddress;
    this.connected = data.connected;
    this.batteryLevels = data.batteryLevels;
    this.productId = data.productId;
    this.vendorId = data.vendorId;
    this.actions = this.generateActions(data.actions);
    this.accessories = this.generateAccessories(data.accessories);
    this.rawDeviceData = data.rawDeviceData;

    if (this.productId && this.vendorId) {
      const customIconPath = this.tryFetchIconPath("main");
      this.icon = customIconPath ? { source: customIconPath } : this.icon;
    }
  }

  private generateActions(additionalActions: ReactNode[]) {
    return [
      this.connected ? (
        <Action
          title="Disconnect"
          key="disconnect-action"
          onAction={() => disconnectDevice(this)}
          icon={{ source: "icons/disconnect.svg", tintColor: Color.PrimaryText }}
        />
      ) : (
        <Action
          title="Connect"
          key="connect-action"
          onAction={() => connectDevice(this)}
          icon={{ source: "icons/connect.svg", tintColor: Color.PrimaryText }}
        />
      ),
      <Action
        title={`Copy Mac Address: ${this.macAddress}`}
        key="copy-mac-address"
        onAction={() => Clipboard.copy(this.macAddress)}
        icon={Icon.Hammer}
      />,
      <Action
        title={`Copy Device Data`}
        key="copy-device-data"
        onAction={() => Clipboard.copy(JSON.stringify(this.rawDeviceData))}
        icon={Icon.ComputerChip}
      />,
      <Action
        title={`Copy Device Name`}
        key="copy-device-name"
        onAction={() => Clipboard.copy(this.name)}
        icon={Icon.Pencil}
      />,
      ...additionalActions,
    ];
  }

  private generateAccessories(accessories: List.Item.Accessory[]) {
    let accessoriesResult = [];
    const defaultIconPath = "icons/bolt.svg";

    if (this.connected) {
      if (this.batteryLevels.main) {
        accessoriesResult.push({
          text: this.batteryLevels.main,
          icon: { source: defaultIconPath, tintColor: Color.PrimaryText },
        });
      }
      if (this.batteryLevels.case) {
        accessoriesResult.push({
          text: this.batteryLevels.case,
          icon: { source: this.tryFetchIconPath("case") ?? defaultIconPath, tintColor: Color.PrimaryText },
        });
      }
      if (this.batteryLevels.left) {
        accessoriesResult.push({
          text: this.batteryLevels.left,
          icon: { source: this.tryFetchIconPath("left") ?? defaultIconPath, tintColor: Color.PrimaryText },
        });
      }
      if (this.batteryLevels.right) {
        accessoriesResult.push({
          text: this.batteryLevels.right,
          icon: { source: this.tryFetchIconPath("right") ?? defaultIconPath, tintColor: Color.PrimaryText },
        });
      }
    }

    accessoriesResult = [...accessoriesResult, ...accessories];
    return accessoriesResult;
  }

  private tryFetchIconPath(iconType: "main" | "case" | "left" | "right"): string | undefined {
    this.vendorId = this.vendorId as string;
    this.productId = this.productId as string;

    try {
      return DevicesMap[this.vendorId][this.productId][iconType];
    } catch (error) {
      return undefined;
    }
  }
}
