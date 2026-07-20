import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useSonyTV } from "./hooks/useSonyTV";

export default function Command() {
  const { isScanning, scanProgress, discoveredTV, localIP, subnet, scan } = useSonyTV();

  const scanStatusText = isScanning ? `Scanning... ${scanProgress}%` : "Scan & Auto-Apply";

  const scanSubtitle = isScanning ? `Checking ${subnet}.0/24` : "Finds TV and applies Smart Settings";

  return (
    <List isLoading={isScanning} searchBarPlaceholder="TV Remote Controls...">
      <List.Section title="Network">
        <List.Item
          title="Local IP"
          subtitle={localIP}
          icon={{ source: Icon.Desktop, tintColor: Color.Blue }}
          accessories={[{ text: subnet ? `${subnet}.0/24` : "" }]}
        />
      </List.Section>

      <List.Section title="Controls">
        <List.Item
          title={scanStatusText}
          subtitle={scanSubtitle}
          icon={{
            source: isScanning ? Icon.Clock : Icon.MagnifyingGlass,
            tintColor: Color.Orange,
          }}
          actions={
            !isScanning ? (
              <ActionPanel>
                <Action title="Start Scan" icon={Icon.Play} onAction={scan} />
              </ActionPanel>
            ) : undefined
          }
        />
      </List.Section>

      {discoveredTV && (
        <List.Section title="Discovered TV">
          <List.Item
            title={discoveredTV.info.model}
            subtitle={discoveredTV.ip}
            icon={{ source: Icon.Monitor, tintColor: Color.Green }}
            accessories={[
              {
                text: discoveredTV.currentMode || "Unknown mode",
                icon: Icon.Video,
              },
            ]}
          />
        </List.Section>
      )}

      {!discoveredTV && !isScanning && (
        <List.Section title="No TV Found">
          <List.Item
            title="No Sony BRAVIA TV detected"
            subtitle="Make sure you're connected to the TV's WiFi network"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action title="Scan Again" icon={Icon.ArrowClockwise} onAction={scan} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
