import { Color, Detail, List } from "@raycast/api";
import type { Device, MDNSService } from "./types";

/** Friendly label for an mDNS service type. */
const SERVICE_LABELS: Record<string, string> = {
  _airplay: "AirPlay",
  _raop: "AirPlay Audio",
  _googlecast: "Google Cast",
  _hap: "HomeKit",
  _matter: "Matter",
  _ipp: "IPP Printer",
  _ipps: "IPP Printer (TLS)",
  _smb: "SMB Sharing",
  _afpovertcp: "AFP Sharing",
  _ssh: "SSH",
  _http: "Web (HTTP)",
  _https: "Web (HTTPS)",
  _sonos: "Sonos",
  _spotifyconnect: "Spotify Connect",
  _tidalconnect: "Tidal Connect",
  _qobuzconnect: "Qobuz Connect",
  _linkplay: "Linkplay",
  _kefinfo: "KEF",
  _deviceinfo: "Device Info",
  _plexmediasvr: "Plex",
  _workstation: "Workstation",
  _applemobdev2: "Apple Mobile",
  _companionlink: "Companion Link",
  _yandexio: "Yandex",
  _aqara: "Aqara",
  _meshcop: "Thread",
};

/** Tag color per service family. */
function serviceColor(type: string): Color {
  const t = type.replace(/\._(tcp|udp)$/, "");
  if (
    /_airplay|_raop|_sonos|_googlecast|_spotifyconnect|_tidalconnect|_qobuzconnect|_linkplay|_kefinfo/.test(
      t,
    )
  )
    return Color.Purple;
  if (/_hap|_matter|_aqara|_meshcop/.test(t)) return Color.Yellow;
  if (/_ipp|_ipps/.test(t)) return Color.Blue;
  if (/_smb|_afpovertcp|_workstation|_deviceinfo/.test(t)) return Color.Green;
  if (/_http|_https/.test(t)) return Color.Blue;
  if (/_ssh/.test(t)) return Color.Blue;
  return Color.SecondaryText;
}

function labelFor(type: string): string {
  const t = type.replace(/\._(tcp|udp)$/, "");
  return SERVICE_LABELS[t] ?? type;
}

/** Format an advertised service for the TagList. */
function serviceTag(svc: MDNSService): { text: string; color: Color } {
  const label = labelFor(svc.type);
  return {
    text: svc.port ? `${label} :${svc.port}` : label,
    color: serviceColor(svc.type),
  };
}

/**
 * Inline sidebar detail for a device. Classic key/value `Metadata` — no icons,
 * no decorative elements. Shows Name, IP, MAC, Vendor (chip), Model +
 * Manufacturer (when mDNS TXT provided them), and the Advertised Services
 * chip list (from mDNS — always present after a sweep).
 *
 * The on-demand web/ssh probe is NOT shown here; it runs as an explicit
 * Action and reports via a HUD toast.
 */
export function DeviceDetail({ device }: { device: Device }): React.ReactNode {
  const services = device.mdnsServices ?? [];
  return (
    <List.Item.Detail.Metadata>
      <Detail.Metadata.Label title="Name" text={device.name ?? "—"} />
      <Detail.Metadata.Label title="IP" text={device.ips.join(", ")} />
      <Detail.Metadata.Label title="MAC" text={device.mac} />
      <Detail.Metadata.TagList title="Vendor">
        <Detail.Metadata.TagList.Item
          text={device.vendorShort ?? device.vendor ?? "unrecognized"}
          color={Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
      {device.model && (
        <Detail.Metadata.Label title="Model" text={device.model} />
      )}
      {device.manufacturer && (
        <Detail.Metadata.Label
          title="Manufacturer"
          text={device.manufacturer}
        />
      )}
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Advertised Services">
        {services.length > 0 ? (
          services.map((svc) => {
            const tag = serviceTag(svc);
            return (
              <Detail.Metadata.TagList.Item
                key={svc.type}
                text={tag.text}
                color={tag.color}
              />
            );
          })
        ) : (
          <Detail.Metadata.TagList.Item text="—" color={Color.SecondaryText} />
        )}
      </Detail.Metadata.TagList>
    </List.Item.Detail.Metadata>
  );
}
