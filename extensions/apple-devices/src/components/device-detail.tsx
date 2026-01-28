import { List } from "@raycast/api";
import React from "react";
import { Device } from "../types";

export default function DeviceDetail(props: { selectedDevice?: Device; showImage: boolean }) {
  const { selectedDevice, showImage } = props;

  return (
    <List.Item.Detail
      markdown={
        showImage
          ? `<img src="${selectedDevice?.image}" height="190" width="100%" alt="${selectedDevice?.model}" />`
          : null
      }
      metadata={
        selectedDevice && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Model" text={`${selectedDevice.device} ${selectedDevice.model}`} />
            <List.Item.Detail.Metadata.Label title="Year" text={selectedDevice.year.toString()} />
            <List.Item.Detail.Metadata.Label
              title="OS"
              text={`${selectedDevice.os_orig} - ${selectedDevice.os_last}`}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Other" />
            <List.Item.Detail.Metadata.Label title="Viewport" text={selectedDevice.resolution} />
            <List.Item.Detail.Metadata.Label title="Display Size" text={`${selectedDevice.display_size}″`} />
            <List.Item.Detail.Metadata.Label title="Display PPI" text={selectedDevice.display_ppi} />
            <List.Item.Detail.Metadata.Label title="Aspect Ratio" text={selectedDevice.aspect_ratio} />
            <List.Item.Detail.Metadata.Label title="Scale Factor" text={selectedDevice.scale_factor} />
            <List.Item.Detail.Metadata.Label title="Display Type" text={selectedDevice.display_type} />
            {selectedDevice.color_profile && (
              <List.Item.Detail.Metadata.Label title="Color Profile" text={selectedDevice.color_profile} />
            )}
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
}
