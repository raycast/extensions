import { Color, List } from "@raycast/api";
import { type Device } from "../lib/unifi/types/device";

export default function ViewDeviceRadios({ deviceDetails }: { deviceDetails: Device }) {
  return (
    <List
      navigationTitle={`Search radios for ${deviceDetails.name}`}
      searchBarPlaceholder="Search through device radios"
    >
      {deviceDetails?.interfaces?.radios?.map((radio, i) => (
        <List.Item
          key={i}
          title={`${radio.frequencyGHz}GHz`}
          keywords={[
            `${radio.frequencyGHz}GHz`,
            `${radio.channel}`,
            `${radio.channelWidthMHz}MHz`,
            `${radio.wlanStandard}`,
          ]}
          accessories={[
            {
              tooltip: "Channel",
              tag: { value: `${radio.channel}`, color: Color.Blue },
            },
            {
              tooltip: "Channel Width",
              tag: {
                value: `${radio.channelWidthMHz}MHz`,
                color: Color.Green,
              },
            },
            {
              tooltip: "Wlan Standard",
              tag: {
                value: `${radio.wlanStandard}`,
                color: Color.Purple,
              },
            },
          ]}
        />
      ))}
    </List>
  );
}
