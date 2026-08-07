import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getIdentity, getWiFi, type WiFiInfo, type WiFiNeighbor } from "./wifi";

/**
 * This Mac command: network identity + Wi-Fi RF + environment, as a single
 * key-value List. Renders in two waves: instant identity/DNS first, then
 * Wi-Fi/neighbors/public-IP after the slow fetches. Rows that can't be
 * fetched (router vendor, BSSID, noise, public IP offline) are hidden, not
 * shown as "—".
 */
export default function Command() {
  const [info, setInfo] = useState<Partial<WiFiInfo>>({});
  const [wave, setWave] = useState<1 | 2>(1);

  useEffect(() => {
    void (async () => {
      await updateCommandMetadata({ subtitle: "Reading network info…" });
      try {
        // Wave 1: instant identity + DNS.
        const identity = await getIdentity();
        setInfo(identity);
        setWave(1);
        await updateCommandMetadata({
          subtitle: "Identity ready · fetching Wi-Fi…",
        });

        // Wave 2: Wi-Fi RF + neighbors + public IP.
        const full = await getWiFi(identity);
        setInfo(full);
        setWave(2);
        const onWifi = !!(full.ssid || full.bssid);
        const subtitle =
          onWifi && full.rssi
            ? `${full.ssid} · ${full.rssi}`
            : onWifi
              ? `${full.ssid} · connected`
              : "Network identity";
        await updateCommandMetadata({ subtitle });
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to read network info",
          message: String(e),
        });
        await updateCommandMetadata({
          subtitle: "Failed to read network info",
        });
      }
    })();
  }, []);

  const onWifi = !!(info.ssid || info.bssid);
  const quality = rssiToQuality(info.rssi);
  const fetching = wave === 1;

  return (
    <List>
      <List.Section title="Identity">
        <Row icon={Icon.Globe} title="IP" text={info.ip} copy={info.ip} />
        <Row
          icon={Icon.Network}
          title="Router IP"
          text={info.routerIp}
          copy={info.routerIp}
        />
        {info.routerVendor && (
          <Row icon={Icon.Tag} title="Router vendor" text={info.routerVendor} />
        )}
        <Row
          icon={Icon.MemoryChip}
          title="MAC"
          text={info.mac}
          copy={info.mac}
        />
        <Row
          icon={Icon.Desktop}
          title="Hostname"
          text={info.hostname}
          copy={info.hostname}
        />
      </List.Section>

      {onWifi ? (
        <List.Section title="Wi-Fi">
          <Row
            icon={Icon.Wifi}
            title="SSID"
            text={info.ssid}
            copy={info.ssid}
          />
          {info.bssid && (
            <Row
              icon={Icon.Wifi}
              title="BSSID"
              text={info.bssid}
              copy={info.bssid}
            />
          )}
          <Row icon={Icon.Lock} title="Security" text={info.security} />
          <Row icon={Icon.FullSignal} title="Channel" text={info.channel} />
          <List.Item
            icon={{ source: Icon.Dot, tintColor: quality.color }}
            title="Signal"
            subtitle={`${quality.label}${info.rssi ? ` · ${info.rssi}` : ""}`}
          />
          <Row icon={Icon.Bolt} title="PHY mode" text={info.phyMode} />
          <Row icon={Icon.ArrowRight} title="Tx rate" text={info.txRate} />
          {info.noise && (
            <Row icon={Icon.BarChart} title="Noise" text={info.noise} />
          )}
        </List.Section>
      ) : fetching ? (
        <List.Section title="Wi-Fi">
          <List.Item
            icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
            title="Fetching Wi-Fi…"
          />
        </List.Section>
      ) : (
        <List.Section title="Wi-Fi">
          <List.Item
            icon={{ source: Icon.WifiDisabled, tintColor: Color.SecondaryText }}
            title="Wi-Fi"
            subtitle="Not connected"
          />
        </List.Section>
      )}

      <List.Section title="Environment">
        {info.publicIp?.ip ? (
          <>
            <Row
              icon={Icon.Map}
              title="Public IP"
              text={info.publicIp.ip}
              copy={info.publicIp.ip}
            />
            <List.Item
              icon={Icon.Map}
              title="Location"
              subtitle={
                [
                  info.publicIp.city,
                  info.publicIp.region,
                  info.publicIp.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
              accessories={
                info.publicIp.org ? [{ text: info.publicIp.org }] : []
              }
            />
          </>
        ) : fetching ? (
          <List.Item
            icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
            title="Fetching public IP…"
          />
        ) : null}
        <Row
          icon={Icon.Globe}
          title="DNS servers"
          text={
            info.dnsServers?.length ? info.dnsServers.join(", ") : undefined
          }
          copy={info.dnsServers?.join("\n")}
        />
        {info.neighbors && info.neighbors.length > 0 && (
          <>
            <List.Item
              icon={Icon.FullSignal}
              title="Wi-Fi neighbors"
              subtitle={`${info.neighbors.length} other networks`}
              accessories={[
                { text: neighborsOnChannel(info.neighbors, info.channel) },
              ]}
            />
            {info.neighbors.map((n, i) => (
              <NeighborRow key={`${n.ssid}-${i}`} neighbor={n} />
            ))}
          </>
        )}
      </List.Section>
    </List>
  );
}

/** A single key-value row with a leading icon and a copy action. */
function Row({
  icon,
  title,
  text,
  copy,
}: {
  icon: Icon;
  title: string;
  text?: string;
  copy?: string;
}) {
  const has = text && text !== "";
  return (
    <List.Item
      icon={icon}
      title={title}
      subtitle={has ? text : "—"}
      actions={
        copy && has ? (
          <ActionPanel>
            <Action.CopyToClipboard title={`Copy ${title}`} content={copy} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

/** One neighbor network, color-coded by RSSI, with band + quality label. */
function NeighborRow({ neighbor }: { neighbor: WiFiNeighbor }) {
  const q = rssiToQuality(neighbor.rssi);
  const band = bandFromChannel(neighbor.channel);
  const chan = neighbor.channel?.split("(")[0].trim();
  // Merge channel + band into ONE padded accessory so the columns align like
  // a table across rows. Channel is "ch "+ up to 3 digits, right-aligned on the
  // digit column; band follows fixed-width (longest "2.4 GHz" = 7 chars).
  const chanStr = chan ? `ch ${chan}`.padStart(6) : "";
  const bandStr = (band ?? "").padEnd(8);
  const tableText = `${chanStr} ${bandStr}`.trimEnd();
  return (
    <List.Item
      icon={{ source: Icon.Dot, tintColor: q.color }}
      title={neighbor.ssid}
      subtitle={neighbor.rssi ? `${q.label} · ${neighbor.rssi}` : "—"}
      accessories={[{ text: tableText }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy SSID" content={neighbor.ssid} />
        </ActionPanel>
      }
    />
  );
}

/** Extract the frequency band from a channel string. macOS writes "2GHz"
 *  for the 2.4 GHz band (not "2.4GHz"), so map the integer back to the
 *  standard band label. Returns "2.4 GHz" / "5 GHz" / "6 GHz". */
function bandFromChannel(channel?: string): string | undefined {
  if (!channel) return undefined;
  const m = channel.match(/\((\d+)\s*GHz/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  if (n === 2) return "2.4 GHz";
  return `${n} GHz`;
}

/** Map an RSSI string like "-58 dBm" to a quality band + color. */
function rssiToQuality(rssi?: string): { label: string; color: Color } {
  if (!rssi) return { label: "Off", color: Color.SecondaryText };
  const m = rssi.match(/(-?\d+)/);
  if (!m) return { label: "Off", color: Color.SecondaryText };
  const v = parseInt(m[1], 10);
  if (v >= -50) return { label: "Excellent", color: Color.Green };
  if (v >= -60) return { label: "Good", color: Color.Green };
  if (v >= -70) return { label: "Fair", color: Color.Yellow };
  return { label: "Weak", color: Color.Red };
}

/** Summarize how many neighbors share the connected channel. */
function neighborsOnChannel(
  neighbors: WiFiNeighbor[],
  myChannel?: string,
): string {
  if (!myChannel) return "";
  const myChan = myChannel.split("(")[0].trim();
  const same = neighbors.filter((n) => {
    const c = n.channel?.split("(")[0].trim();
    return c === myChan;
  });
  return same.length === 0
    ? `Channel ${myChan}: clear`
    : `Channel ${myChan}: ${same.length + 1} networks`;
}
