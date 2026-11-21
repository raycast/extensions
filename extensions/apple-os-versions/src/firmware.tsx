import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatBytes, startDownload } from "./downloads";
import { appleDownloadUrl, Platform, text as str } from "./sofa";

const API_BASE = "https://api.ipsw.me/v4";

// ipsw.me lists every OS sharing a version number together, so devices are matched to the platform by identifier.
const IDENTIFIER_PATTERNS: Record<Platform, RegExp> = {
  macOS: /^(Mac|iMac|VirtualMac)/,
  iOS: /^(iPhone|iPod)/,
  iPadOS: /^iPad/,
  watchOS: /^Watch/,
  tvOS: /^AppleTV/,
  visionOS: /^RealityDevice/,
};

// Apple doesn't publish restore images for Apple Watch.
export function hasFirmware(platform: Platform): boolean {
  return platform !== "watchOS";
}

type Firmware = {
  url: string;
  fileName: string;
  build: string;
  size?: number;
  sha256?: string;
  signed: boolean;
  devices: { identifier: string; name: string }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`ipsw.me returned ${response.status} ${response.statusText}`);
  return response.json();
}

async function fetchDeviceNames(): Promise<Record<string, string>> {
  const devices = await getJson(`${API_BASE}/devices`);
  const names: Record<string, string> = {};
  for (const device of Array.isArray(devices) ? devices : []) {
    const identifier = isRecord(device) ? str(device.identifier) : undefined;
    const name = isRecord(device) ? str(device.name) : undefined;
    if (identifier && name) names[identifier] = name;
  }
  return names;
}

// Devices that share a restore image are grouped under one download.
async function fetchFirmware(platform: Platform, version: string): Promise<Firmware[]> {
  const [entries, names] = await Promise.all([
    getJson(`${API_BASE}/ipsw/${encodeURIComponent(version)}`),
    fetchDeviceNames().catch(() => ({}) as Record<string, string>),
  ]);
  const byUrl = new Map<string, Firmware>();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!isRecord(entry)) continue;
    const identifier = str(entry.identifier);
    const url = appleDownloadUrl(entry.url);
    if (!identifier || !url || !IDENTIFIER_PATTERNS[platform].test(identifier)) continue;
    const device = { identifier, name: Object.hasOwn(names, identifier) ? names[identifier] : identifier };
    const existing = byUrl.get(url);
    if (existing) {
      existing.devices.push(device);
      continue;
    }
    const sha256 = str(entry.sha256sum);
    byUrl.set(url, {
      url,
      fileName: decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "") || `${identifier}_${version}.ipsw`,
      build: str(entry.buildid) ?? "",
      size: typeof entry.filesize === "number" && entry.filesize > 0 ? entry.filesize : undefined,
      sha256: sha256 && /^[0-9a-f]{64}$/i.test(sha256) ? sha256.toLowerCase() : undefined,
      signed: entry.signed === true,
      devices: [device],
    });
  }
  return [...byUrl.values()]
    .map((firmware) => ({
      ...firmware,
      devices: firmware.devices.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    }))
    .sort(
      (a, b) =>
        Number(b.signed) - Number(a.signed) ||
        b.devices.length - a.devices.length ||
        a.devices[0].name.localeCompare(b.devices[0].name, undefined, { numeric: true }),
    );
}

function firmwareTitle({ devices }: Firmware): string {
  if (devices.length <= 2) return devices.map((device) => device.name).join(", ");
  return `${devices[0].name} + ${devices.length - 1} more`;
}

export function FirmwareList({ platform, title, version }: { platform: Platform; title: string; version: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchFirmware, [platform, version]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${title} Firmware`}
      searchBarPlaceholder="Filter by device, identifier, or build"
    >
      {!isLoading && (
        <List.EmptyView
          icon={error ? Icon.WifiDisabled : Icon.HardDrive}
          title={error ? "Couldn't Load Firmware" : `No Firmware for ${title}`}
          description={error?.message ?? "ipsw.me doesn't list a restore image for this version."}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {data?.map((firmware) => {
        const accessories: List.Item.Accessory[] = [
          {
            tag: {
              value: firmware.signed ? "Signed" : "Not Signed",
              color: firmware.signed ? Color.Green : Color.SecondaryText,
            },
            tooltip: firmware.signed
              ? "Apple is still signing this firmware, so it can be restored"
              : "Apple no longer signs this firmware, so it can't be restored",
          },
        ];
        if (firmware.devices.length > 2) {
          accessories.unshift({
            text: `${firmware.devices.length} devices`,
            icon: Icon.Devices,
            tooltip: firmware.devices.map((device) => device.name).join("\n"),
          });
        }
        if (firmware.size) accessories.push({ text: formatBytes(firmware.size) });

        return (
          <List.Item
            key={firmware.url}
            icon={Icon.HardDrive}
            title={firmwareTitle(firmware)}
            subtitle={firmware.build}
            keywords={[firmware.build, ...firmware.devices.flatMap((device) => [device.name, device.identifier])]}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Download Firmware"
                  icon={Icon.Download}
                  onAction={() =>
                    startDownload({
                      url: firmware.url,
                      fileName: firmware.fileName,
                      title: `${title} ${version} (${firmware.build}) firmware`,
                      size: firmware.size,
                      sha256: firmware.sha256,
                    })
                  }
                />
                <Action.CopyToClipboard title="Copy Download URL" content={firmware.url} />
                {firmware.sha256 && <Action.CopyToClipboard title="Copy SHA-256" content={firmware.sha256} />}
                <Action.CopyToClipboard
                  title="Copy Device Identifiers"
                  content={firmware.devices.map((device) => device.identifier).join(", ")}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
