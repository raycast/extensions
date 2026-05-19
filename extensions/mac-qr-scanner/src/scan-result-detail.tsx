import {
  Detail,
  Action,
  ActionPanel,
  Icon,
  showHUD,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState } from "react";
import {
  type WifiNetwork,
  looksLikeUrl,
  parseWifi,
  connectToWifi,
} from "./utils";

export function ScanResultDetail({ data }: { data: string }) {
  const [showPassword, setShowPassword] = useState(false);

  const wifi = parseWifi(data);
  const isUrl = looksLikeUrl(data);
  const canConnectToWifi = wifi ? canConnect(wifi) : false;

  return (
    <Detail
      markdown={buildMarkdown(data, wifi, isUrl, canConnectToWifi)}
      metadata={wifi ? buildWifiMetadata(wifi, showPassword) : undefined}
      actions={
        <ActionPanel>
          {wifi && canConnectToWifi && (
            <Action
              title="Connect to Network"
              icon={Icon.Wifi}
              onAction={async () => {
                try {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: `Connecting to ${wifi.ssid}…`,
                  });
                  await connectToWifi(wifi);
                  await showHUD(`Connected to ${wifi.ssid}`);
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Connection Failed",
                    message:
                      error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          )}
          {wifi && wifi.password && (
            <Action
              title={showPassword ? "Hide Password" : "Show Password"}
              icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => setShowPassword((prev) => !prev)}
            />
          )}
          {isUrl && <Action.OpenInBrowser url={data} icon={Icon.Globe} />}
          {wifi && (
            <Action.CopyToClipboard
              title="Copy Network Name"
              content={wifi.ssid}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onCopy={() => showHUD("Network name copied")}
            />
          )}
          {wifi && wifi.password && (
            <Action.CopyToClipboard
              title="Copy Password"
              content={wifi.password}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onCopy={() => showHUD("Password copied")}
            />
          )}
          {!wifi && (
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={data}
              onCopy={() => showHUD("Copied to clipboard")}
            />
          )}
          <Action
            title="View QR Scan History"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={async () => {
              await launchCommand({
                name: "scan-history",
                type: LaunchType.UserInitiated,
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function canConnect(wifi: WifiNetwork): boolean {
  return wifi.security.toLowerCase() === "nopass" || wifi.password.length > 0;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&").replace(/\n/g, "\\n");
}

function buildWifiMetadata(wifi: WifiNetwork, showPassword: boolean) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Network" text={wifi.ssid} />
      <Detail.Metadata.Label
        title="Security"
        text={wifi.security.toUpperCase()}
      />
      {wifi.password ? (
        <Detail.Metadata.Label
          title="Password"
          text={showPassword ? wifi.password : "••••••••"}
          icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
        />
      ) : null}
      {wifi.hidden ? <Detail.Metadata.Label title="Hidden" text="Yes" /> : null}
    </Detail.Metadata>
  );
}

function buildMarkdown(
  decoded: string,
  wifi: WifiNetwork | null,
  isUrl: boolean,
  canConnectToWifi: boolean,
): string {
  if (wifi) {
    const network = escapeMarkdown(wifi.ssid);
    return [
      `**Wi-Fi Network Found**`,
      ``,
      canConnectToWifi
        ? `Press \`↵\` to connect to **${network}**.`
        : `**${network}** is saved without a password. Copy the network name and join manually if needed.`,
    ].join("\n");
  }

  const safeDecoded = escapeMarkdown(decoded);

  if (isUrl) {
    return [
      `**QR Code Found!**`,
      ``,
      `\`${safeDecoded}\``,
      ``,
      `---`,
      ``,
      `\`↵\` Open in Browser · \`⌘C\` Copy to Clipboard`,
    ].join("\n");
  }

  return [
    `**QR Code Found!**`,
    ``,
    `\`${safeDecoded}\``,
    ``,
    `---`,
    ``,
    `\`↵\` Copy to Clipboard`,
  ].join("\n");
}
