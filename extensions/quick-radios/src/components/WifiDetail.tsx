import { Color, Icon, List } from "@raycast/api";
import { WifiNetwork, WifiStatus } from "../services/types";

interface WifiDetailProps {
  network: WifiNetwork;
  status: WifiStatus;
  savedPassword?: string;
}

const CONNECTED_BADGE =
  "![Connected](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI5IiBmaWxsPSIjMzBEMTU4Ii8+PHBhdGggZD0iTTYgMTAuNWwzIDMgNS02IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMi4yIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=)";

export function WifiDetail({
  network,
  status,
  savedPassword,
}: WifiDetailProps) {
  const isCurrent = network.isConnected;
  const signalRating = getSignalRating(network.signalPercent);

  // Markdown metadata block
  let markdown = `## ${network.ssid}\n\n`;

  if (isCurrent) {
    markdown += `**Status**: ${CONNECTED_BADGE} **Connected**  \n`;
    if (status.internetSpeed) {
      markdown += `**Internet Speed**: ⬇️ ${status.internetSpeed.downloadMbps} Mbps / ⬆️ ${status.internetSpeed.uploadMbps} Mbps  \n`;
    } else if (status.isTestingSpeed) {
      markdown += `**Internet Speed**: ⏳ Measuring...  \n`;
    }
    if (status.sessionData) {
      const downGb = (
        status.sessionData.downloadedBytes /
        (1024 * 1024 * 1024)
      ).toFixed(2);
      const upGb = (
        status.sessionData.uploadedBytes /
        (1024 * 1024 * 1024)
      ).toFixed(2);
      markdown += `**Session Data**: ⬇️ ${downGb} GB / ⬆️ ${upGb} GB  \n`;
    }
    if (status.ipAddress) {
      markdown += `**IP Address**: \`${status.ipAddress}\`  \n`;
    }
    if (status.gateway) {
      markdown += `**Gateway**: \`${status.gateway}\`  \n`;
    }
    if (status.macAddress) {
      markdown += `**Physical Address (MAC)**: \`${status.macAddress}\`  \n`;
    }
  } else if (network.isSaved && network.signalPercent > 0) {
    markdown += `**Status**: 💾 **Saved and in Range** (${network.signalPercent}%)  \n`;
  } else if (network.isSaved) {
    markdown += `**Status**: ⚪ **Saved (Out of Range)**  \n`;
  } else {
    markdown += `**Status**: 📶 **In Range** (${network.signalPercent}%)  \n`;
  }

  // QR Code preview if password or open network
  if (
    network.isSaved &&
    (savedPassword || network.authentication.toLowerCase().includes("open"))
  ) {
    const qrString = generateWifiQrString(
      network.ssid,
      savedPassword,
      network.authentication,
    );
    const qrUrl = getWifiQrCodeImageUrl(qrString);
    markdown += `\n---\n### 📱 Scan to Join\n![Wi-Fi QR Code](${qrUrl})\n`;
    if (savedPassword) {
      markdown += `\n**Password**: \`${savedPassword}\`  \n`;
    }
  }

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Network Name (SSID)"
            text={network.ssid}
          />
          <List.Item.Detail.Metadata.Label
            title="Signal Strength"
            text={
              network.signalPercent > 0
                ? `${network.signalPercent}% (${signalRating})`
                : "Out of Range"
            }
          />
          {network.band && (
            <List.Item.Detail.Metadata.Label
              title="Frequency Band"
              text={network.band}
            />
          )}
          {isCurrent && status.channel && (
            <List.Item.Detail.Metadata.Label
              title="Channel"
              text={status.channel}
            />
          )}
          {isCurrent && status.radioType && (
            <List.Item.Detail.Metadata.Label
              title="Radio Standard"
              text={status.radioType}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Authentication"
            text={network.authentication || "Open"}
          />
          {network.encryption && (
            <List.Item.Detail.Metadata.Label
              title="Encryption"
              text={network.encryption}
            />
          )}
          {isCurrent && (
            <List.Item.Detail.Metadata.Label
              title="Internet Speed"
              text={
                status.internetSpeed
                  ? `⬇️ ${status.internetSpeed.downloadMbps} Mbps / ⬆️ ${status.internetSpeed.uploadMbps} Mbps`
                  : status.isTestingSpeed
                    ? "Measuring..."
                    : "Not tested"
              }
            />
          )}
          {isCurrent && status.sessionData && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Session Downloaded"
                text={`${(status.sessionData.downloadedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`}
              />
              <List.Item.Detail.Metadata.Label
                title="Session Uploaded"
                text={`${(status.sessionData.uploadedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`}
              />
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Connection State">
            <List.Item.Detail.Metadata.TagList.Item
              icon={{
                source: isCurrent
                  ? Icon.CheckCircle
                  : network.isSaved
                    ? network.signalPercent > 0
                      ? Icon.Wifi
                      : Icon.SaveDocument
                    : Icon.Wifi,
                tintColor: isCurrent
                  ? Color.Green
                  : network.isSaved
                    ? network.signalPercent > 0
                      ? Color.Blue
                      : Color.SecondaryText
                    : Color.SecondaryText,
              }}
              text={
                isCurrent
                  ? "Connected"
                  : network.isSaved
                    ? network.signalPercent > 0
                      ? "Saved and in Range"
                      : "Saved (Out of Range)"
                    : "In Range"
              }
              color={
                isCurrent
                  ? Color.Green
                  : network.isSaved
                    ? network.signalPercent > 0
                      ? Color.Blue
                      : Color.SecondaryText
                    : Color.SecondaryText
              }
            />
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function getSignalRating(percent: number): string {
  if (percent >= 80) return "Excellent";
  if (percent >= 60) return "Good";
  if (percent >= 40) return "Fair";
  if (percent > 0) return "Weak";
  return "Out of Range";
}

function generateWifiQrString(
  ssid: string,
  password?: string,
  authentication = "WPA",
): string {
  const auth =
    !password || authentication.toLowerCase().includes("open")
      ? "nopass"
      : "WPA";
  const escapedSsid = ssid.replace(/([\\;,:"])/g, "\\$1");
  const escapedPassword = password
    ? password.replace(/([\\;,:"])/g, "\\$1")
    : "";
  return `WIFI:T:${auth};S:${escapedSsid};P:${escapedPassword};;`;
}

function getWifiQrCodeImageUrl(wifiQrString: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&data=${encodeURIComponent(wifiQrString)}`;
}
