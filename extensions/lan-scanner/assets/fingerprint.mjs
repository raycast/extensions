// Firmware fingerprinting for IoT devices (ESPHome, PixelIt, WLED, Tasmota, Shelly, ESPEasy, AWTRIX, Tuya).
// Everything here is read-only: plain GETs of status endpoints and passive listening for Tuya UDP broadcasts.
import http from "node:http";
import zlib from "node:zlib";
import dgram from "node:dgram";
import crypto from "node:crypto";

/** GET a URL, return {status, headers, body}; handles servers that send gzip bytes without a header. */
function get(ip, port, path, { timeout = 2500, maxBytes = 200_000 } = {}) {
  return new Promise((resolve) => {
    const req = http.get({ host: ip, port, path, timeout, headers: { "User-Agent": "lan-scanner" } }, (res) => {
      const chunks = [];
      let size = 0;
      res.on("data", (c) => {
        chunks.push(c);
        size += c.length;
        if (size > maxBytes) req.destroy();
      });
      const done = () => {
        let buf = Buffer.concat(chunks);
        if (buf[0] === 0x1f && buf[1] === 0x8b) {
          try {
            buf = zlib.gunzipSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH, maxOutputLength: maxBytes * 5 });
          } catch {}
        }
        resolve({ status: res.statusCode, headers: res.headers, body: buf.toString("utf8") });
      };
      res.on("end", done);
      res.on("close", done);
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
  });
}

async function getJson(ip, port, path) {
  const r = await get(ip, port, path);
  if (!r || r.status !== 200) return null;
  try {
    return JSON.parse(r.body);
  } catch {
    return null;
  }
}

/** ESPHome web_server: the first SSE "ping" event carries the node title and comment. */
function esphomeEvents(ip, port) {
  return new Promise((resolve) => {
    let buf = "";
    const req = http.get({ host: ip, port, path: "/events", timeout: 3000 }, (res) => {
      res.on("data", (c) => {
        buf += c.toString();
        const m = buf.match(/event: ping\s*\ndata: (\{.*\})/);
        if (m) {
          req.destroy();
          try {
            resolve(JSON.parse(m[1]));
          } catch {
            resolve(null);
          }
        } else if (buf.length > 20_000) req.destroy();
      });
      res.on("close", () => resolve(null));
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
  });
}

const title = (html) => html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || null;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));

/** Fingerprint one device over HTTP. Returns {kind, name, version, model, id, details} or null. */
export async function httpFingerprint(ip, ports) {
  const webPorts = ports.filter((p) => p.port === 80 || /http/.test(p.service ?? "")).map((p) => p.port);
  if (!webPorts.includes(80) && webPorts.length === 0) return null;
  const port = webPorts.includes(80) ? 80 : webPorts[0];

  const root = await get(ip, port, "/");
  const html = root?.body ?? "";
  const t = title(html);
  const server = String(root?.headers?.server ?? "");

  // ESPHome (web_server v1/v2/v3)
  if (/esphome|<esp-app>/i.test(html) || /esphome/i.test(server)) {
    const ev = await esphomeEvents(ip, port);
    const name = ev?.title || t?.replace(/ Web Server$/, "") || null;
    return { kind: "ESPHome", name, details: clean({ comment: ev?.comment, ota: ev?.ota }) };
  }
  // PixelIt
  if (/pixelit/i.test(html)) {
    const i = await getJson(ip, port, "/api/matrixinfo");
    return {
      kind: "PixelIt",
      name: i?.note || i?.hostname || null,
      version: i?.pixelitVersion ?? null,
      model: i?.buildSection ?? null,
      id: i?.deviceID ?? null,
      details: clean({ chipID: i?.chipID, hostname: i?.hostname, sketchSize: i?.sketchSize, rssi: i?.wifiRSSI }),
    };
  }
  // Tasmota
  if (/tasmota/i.test(`${html} ${server}`)) {
    const s = await getJson(ip, port, "/cm?cmnd=Status%200");
    return {
      kind: "Tasmota",
      name: s?.Status?.DeviceName || s?.Status?.FriendlyName?.[0] || t,
      version: s?.StatusFWR?.Version ?? null,
      model: s?.StatusFWR?.Hardware ?? null,
      details: clean({ topic: s?.Status?.Topic, module: s?.Status?.Module }),
    };
  }
  // the rest have no reliable marker on "/", try their JSON APIs
  const wled = await getJson(ip, port, "/json/info");
  if (wled?.ver && (wled.brand === "WLED" || wled.leds)) {
    return { kind: "WLED", name: wled.name, version: wled.ver, model: wled.arch, details: clean({ leds: wled.leds?.count, mac: wled.mac }) };
  }
  const shelly = await getJson(ip, port, "/shelly");
  if (shelly && (shelly.type || shelly.model || shelly.gen)) {
    return {
      kind: "Shelly",
      name: shelly.name ?? null,
      version: shelly.fw ?? shelly.ver ?? null,
      model: shelly.model ?? shelly.type ?? null,
      id: shelly.id ?? shelly.mac ?? null,
    };
  }
  const awtrix = await getJson(ip, port, "/api/stats");
  if (awtrix && ("matrix" in awtrix || "app" in awtrix) && awtrix.version) {
    return { kind: "AWTRIX", name: null, version: awtrix.version, details: clean({ app: awtrix.app }) };
  }
  const espeasy = await getJson(ip, port, "/json");
  if (espeasy?.System?.["Unit Name"] || espeasy?.System?.Build) {
    return {
      kind: "ESPEasy",
      name: espeasy.System["Unit Name"] ?? null,
      version: String(espeasy.System.Build ?? ""),
      details: clean({ unit: espeasy.System["Unit Number"] }),
    };
  }
  if (t || server) return { kind: "Web", name: t, details: clean({ server }) };
  return null;
}

/**
 * Passively listen for Tuya LAN discovery broadcasts (UDP 6666 plain, 6667 AES-ECB with a public key).
 * Returns a stop() that resolves to Map<ip, info>. Protocol 3.5 (GCM) packets are ignored.
 */
export function listenTuya() {
  const key = crypto.createHash("md5").update("yGAdlopoPVldABfn").digest();
  const found = new Map();
  const sockets = [];
  for (const port of [6666, 6667]) {
    const s = dgram.createSocket({ type: "udp4", reuseAddr: true });
    s.on("message", (msg, rinfo) => {
      const payload = msg.subarray(20, msg.length - 8);
      let info = null;
      try {
        info = JSON.parse(payload.toString("utf8"));
      } catch {
        try {
          const d = crypto.createDecipheriv("aes-128-ecb", key, null);
          info = JSON.parse(Buffer.concat([d.update(payload), d.final()]).toString());
        } catch {}
      }
      if (info?.gwId) found.set(info.ip ?? rinfo.address, info);
    });
    s.on("error", () => {});
    try {
      s.bind(port);
      sockets.push(s);
    } catch {}
  }
  return () => {
    for (const s of sockets) s.close();
    return found;
  };
}

export function tuyaFingerprint(info) {
  return {
    kind: "Tuya",
    name: null,
    version: info.version ? `protocol ${info.version}` : null,
    model: info.productKey ?? null,
    id: info.gwId,
    details: clean({ productKey: info.productKey, encrypted: info.encrypt }),
  };
}
