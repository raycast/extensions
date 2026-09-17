import http from "node:http";
import { createLog } from "../lib/debug";
const log = createLog("playerUPnP");

// ---- XML helpers ----

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function xmlTagContent(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);

  return match ? unescapeXml(match[1].trim()) : undefined;
}

// ---- UPnP SOAP request ----

export interface UpnpRequestOptions {
  host: string;
  port: number;
  serviceType: "AVTransport" | "RenderingControl" | "ConnectionManager" | "PlayQueue";
  action: string;
  body: string;
  timeout?: number;
  signal?: AbortSignal;
}

/** Control URL paths from the device description. */
const CONTROL_URLS: Record<UpnpRequestOptions["serviceType"], string> = {
  AVTransport: "/upnp/control/rendertransport1",
  RenderingControl: "/upnp/control/rendercontrol1",
  ConnectionManager: "/upnp/control/renderconnmgr1",
  PlayQueue: "/upnp/control/PlayQueue1",
};

/**
 * Send a SOAP request to the device's UPnP control endpoint and return the raw XML response body.
 */
export function upnpRequest(options: UpnpRequestOptions): Promise<string> {
  const { host, port, serviceType, action, body, timeout = 5000, signal } = options;

  const serviceUrn = `urn:schemas-upnp-org:service:${serviceType}:1`;
  const path = CONTROL_URLS[serviceType];

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": 'text/xml; charset="utf-8"',
          SOAPACTION: `"${serviceUrn}#${action}"`,
          "Content-Length": Buffer.byteLength(body),
        },
        timeout,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      },
    );

    req.on("error", (err) => {
      log.log(`UPnP ${action} failed: ${err.message}`);
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`UPnP ${action} timeout`));
    });

    signal?.addEventListener("abort", () => {
      req.destroy();
      reject(new Error("Aborted"));
    });

    req.write(body);
    req.end();
  });
}

function makeGetInfoExBody(): string {
  return (
    '<?xml version="1.0"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
    "<s:Body>" +
    '<u:GetInfoEx xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">' +
    "<InstanceID>0</InstanceID>" +
    "</u:GetInfoEx>" +
    "</s:Body>" +
    "</s:Envelope>"
  );
}

export async function getSpotifyTrackInfo(
  host: string,
  upnpPort: number,
  signal?: AbortSignal,
): Promise<RecordingSummary | null> {
  try {
    const data = await upnpRequest({
      host,
      port: upnpPort,
      serviceType: "AVTransport",
      action: "GetInfoEx",
      body: makeGetInfoExBody(),
      signal,
    });

    const didl = xmlTagContent(data, "TrackMetaData");

    if (!didl) {
      log.log("No TrackMetaData in GetInfoEx response");

      return null;
    }

    const title = xmlTagContent(didl, "dc:title");

    if (!title) {
      log.log("No dc:title in DIDL-Lite");

      return null;
    }

    const recording: RecordingSummary = {
      id: "",
      title,
      artist: xmlTagContent(didl, "upnp:artist") || "",
      album: xmlTagContent(didl, "upnp:album") || "",
      length: xmlTagContent(data, "TrackDuration") || "",
      date: "",
      coverArt: xmlTagContent(didl, "upnp:albumArtURI") || null,
    };

    log.log("Got Spotify track info:", recording);

    return recording;
  } catch (err) {
    log.log(`GetInfoEx failed: ${err}`);

    return null;
  }
}
