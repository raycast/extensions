import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getDevices, setDefaultOutput } from "./audio/devices";
import { getSystemVolume, setSystemVolume } from "./audio/volume";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(async () => ({
    devices: await getDevices(),
    volume: await getSystemVolume(),
  }));

  const outputs = data?.devices.filter((d) => d.kind === "output") ?? [];
  const inputs = data?.devices.filter((d) => d.kind === "input") ?? [];

  const volumeActions = (
    <ActionPanel.Section title="System Volume">
      {[0, 25, 50, 75, 100].map((v) => (
        <Action
          key={v}
          title={`Set Volume ${v}%`}
          icon={Icon.Speaker}
          onAction={async () => {
            await setSystemVolume(v);
            revalidate();
          }}
        />
      ))}
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search devices — system volume ${data?.volume ?? "–"}%`}
    >
      <List.Section title="Output">
        {outputs.map((d) => (
          <List.Item
            key={`${d.kind}-${d.id}`}
            icon={
              d.isDefault
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : d.isWireless
                  ? Icon.Bluetooth
                  : Icon.Plug
            }
            title={d.name}
            accessories={[
              {
                tag: {
                  value: d.transportType,
                  color: d.isWireless ? Color.Blue : Color.SecondaryText,
                },
              },
              ...(d.volume !== undefined
                ? [{ text: `${Math.round(d.volume * 100)}%` }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Output"
                  icon={Icon.Speaker}
                  onAction={async () => {
                    const ok = await setDefaultOutput(d.id);
                    await showToast({
                      style: ok ? Toast.Style.Success : Toast.Style.Failure,
                      title: ok ? `Output: ${d.name}` : "Switch failed",
                    });
                    revalidate();
                  }}
                />
                {volumeActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Input">
        {inputs.map((d) => (
          <List.Item
            key={`${d.kind}-${d.id}`}
            icon={d.isWireless ? Icon.Bluetooth : Icon.Microphone}
            title={d.name}
            accessories={[{ tag: d.transportType }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
