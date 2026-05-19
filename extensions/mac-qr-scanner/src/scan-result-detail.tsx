import {
  Detail,
  Action,
  ActionPanel,
  Icon,
  Color,
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

  return (
    <Detail
      markdown={buildMarkdown(data, wifi, isUrl)}
      metadata={wifi ? buildWifiMetadata(wifi, showPassword) : undefined}
      actions={
        <ActionPanel>
          {wifi && (
            <Action
              title="Connect to Network"
              icon={Icon.Wifi}
              onAction={async () => {
                try {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: `Connecting to ${wifi.ssid}…`,
                    message:
                      "If macOS shows a networksetup dialog, you can click Deny.",
                  });
                  await connectToWifi(wifi);
                  await showHUD(`Connected to ${wifi.ssid}`);
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Connection failed",
                    message:
                      error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          )}
          {wifi && (
            <Action
              title={showPassword ? "Hide Password" : "Show Password"}
              icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => setShowPassword((prev) => !prev)}
            />
          )}
          {isUrl && <Action.OpenInBrowser url={data} />}
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
            title="View History"
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
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Actions">
        <Detail.Metadata.TagList.Item text="↵ Connect" color={Color.Green} />
        <Detail.Metadata.TagList.Item
          text="⌘⇧P Display Password"
          color={Color.Orange}
        />
        <Detail.Metadata.TagList.Item
          text="⌘⇧C Copy Network Name"
          color={Color.Blue}
        />
        {wifi.password ? (
          <Detail.Metadata.TagList.Item
            text="⌘⇧V Copy Password"
            color={Color.Purple}
          />
        ) : null}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}

function buildMarkdown(
  decoded: string,
  wifi: WifiNetwork | null,
  isUrl: boolean,
): string {
  if (wifi) {
    return [
      `**Wi-Fi Network Found**`,
      ``,
      `Press \`↵\` to connect to **${wifi.ssid}**.`,
      ``,
      `> When connecting, macOS may show a \`networksetup\` dialog asking to use the System keychain. This is a side-effect of how macOS allows external programs to establish a wifi-connection. You can safely click **Deny**.`,
    ].join("\n");
  }

  if (isUrl) {
    return [
      `**QR Code Found!**`,
      ``,
      `\`${decoded}\``,
      ``,
      `---`,
      ``,
      `\`↵\` Open in Browser · \`⌘C\` Copy to Clipboard`,
    ].join("\n");
  }

  return [
    `**QR Code Found!**`,
    ``,
    `\`${decoded}\``,
    ``,
    `---`,
    ``,
    `\`↵\` Copy to Clipboard`,
  ].join("\n");
}
