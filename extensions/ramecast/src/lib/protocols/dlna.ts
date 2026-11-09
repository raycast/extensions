import { protocolLog } from "./log";
import { escapeXml, ssdpSearch, xmlTag } from "./ssdp";
import type { Adapter, Device } from "./types";

const RENDERER = "urn:schemas-upnp-org:device:MediaRenderer:1";

/** Fetch a UPnP device description and pull out what we need to control its AVTransport service. */
async function describe(location: string, address: string): Promise<Device | undefined> {
  const res = await fetch(location, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) return undefined;
  const xml = await res.text();

  const service = [...xml.matchAll(/<service>([\s\S]*?)<\/service>/gi)]
    .map((m) => m[1])
    .find((s) => /AVTransport/i.test(xmlTag(s, "serviceType") ?? ""));
  const serviceType = service && xmlTag(service, "serviceType");
  const controlPath = service && xmlTag(service, "controlURL");
  if (!serviceType || !controlPath) return undefined;

  const base = xmlTag(xml, "URLBase") || location;
  const url = new URL(location);
  return {
    protocol: "dlna",
    id: xmlTag(xml, "UDN") ?? location,
    name: xmlTag(xml, "friendlyName") ?? address,
    model: [xmlTag(xml, "manufacturer"), xmlTag(xml, "modelName")].filter(Boolean).join(" ") || "DLNA Renderer",
    host: address,
    port: Number(url.port) || 80,
    meta: { controlUrl: new URL(controlPath, base).toString(), serviceType },
  };
}

async function soap(device: Device, action: string, args: string, log?: (l: string) => void): Promise<void> {
  const { controlUrl, serviceType } = device.meta ?? {};
  const body =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">` +
    `<s:Body><u:${action} xmlns:u="${serviceType}"><InstanceID>0</InstanceID>${args}</u:${action}></s:Body></s:Envelope>`;
  log?.(`>> ${action} ${controlUrl}`);
  const res = await fetch(controlUrl, {
    method: "POST",
    headers: { "Content-Type": 'text/xml; charset="utf-8"', SOAPAction: `"${serviceType}#${action}"` },
    body,
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  log?.(`<< ${res.status} ${text.slice(0, 1000)}`);
  if (!res.ok) {
    const reason = xmlTag(text, "errorDescription") ?? xmlTag(text, "faultstring") ?? `HTTP ${res.status}`;
    throw new Error(`TV rejected ${action}: ${reason}`);
  }
}

/** DIDL-Lite metadata; many TVs refuse a URI without it. Flags mark the stream as live (no seeking). */
function didl(url: string): string {
  const protocolInfo =
    "http-get:*:video/mpeg:DLNA.ORG_PN=MPEG_TS_HD_NA_ISO;DLNA.ORG_OP=00;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000";
  return (
    `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">` +
    `<item id="0" parentID="-1" restricted="1"><dc:title>RameCast Screen</dc:title><upnp:class>object.item.videoItem</upnp:class>` +
    `<res protocolInfo="${protocolInfo}">${escapeXml(url)}</res></item></DIDL-Lite>`
  );
}

export const dlna: Adapter = {
  protocol: "dlna",
  label: "DLNA",

  async discover(onFound, durationMs) {
    const seen = new Set<string>();
    const pending: Promise<void>[] = [];
    await ssdpSearch([RENDERER], durationMs, ({ headers, address }) => {
      const location = headers.location;
      if (!location || seen.has(location)) return;
      seen.add(location);
      pending.push(
        describe(location, address)
          .then((d) => d && onFound(d))
          .catch(() => undefined),
      );
    });
    await Promise.all(pending);
  },

  async play(device, urls) {
    const log = protocolLog("dlna");
    try {
      await soap(device, "Stop", "", log);
    } catch {
      // nothing was playing
    }
    await soap(
      device,
      "SetAVTransportURI",
      `<CurrentURI>${escapeXml(urls.ts)}</CurrentURI><CurrentURIMetaData>${escapeXml(didl(urls.ts))}</CurrentURIMetaData>`,
      log,
    );
    await soap(device, "Play", "<Speed>1</Speed>", log);
  },

  stop(device) {
    return soap(device, "Stop", "", protocolLog("dlna", false));
  },
};
