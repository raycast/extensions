// Writes a fictional network into <dataDir>/state.json, used for store screenshots.
// Usage: node scripts/demo-state.mjs <dataDir>
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: demo-state.mjs <dataDir>");
const now = Date.now();
const min = 60_000;
const h = 60 * min;
const day = 24 * h;

const port = (p, service, product = null, title = null) => ({ port: p, proto: "tcp", service, product, extra: null, title });
let n = 0;
const dev = (ip, vendor, extra) => {
  n++;
  const mac = `02:00:5e:10:00:${n.toString(16).padStart(2, "0")}`;
  return {
    key: mac,
    mac,
    ip: `192.168.1.${ip}`,
    vendor,
    randomMac: false,
    firstSeen: now - 40 * day + n * h,
    lastSeen: now - 2 * min,
    online: true,
    portsScannedAt: now - 3 * h,
    ports: [],
    ...extra,
  };
};

const devices = [
  dev(1, "Ubiquiti Networks", {
    isGateway: true,
    type: "Router / gateway",
    hostname: "unifi.lan",
    ports: [port(53, "domain", "dnsmasq 2.90"), port(80, "http"), port(443, "https", null, "UniFi OS")],
    firmware: { kind: "Web", name: "UniFi OS" },
  }),
  dev(5, "Synology", {
    type: "NAS",
    mdnsName: "nas.local",
    ports: [
      port(22, "ssh", "OpenSSH 9.6"),
      port(139, "netbios-ssn", "Samba smbd 4"),
      port(445, "microsoft-ds"),
      port(5000, "http", "nginx", "Synology DiskStation"),
      port(5001, "https", "nginx"),
    ],
    osHint: "Linux",
  }),
  dev(10, "Raspberry Pi Trading", {
    type: "Home Assistant",
    mdnsName: "homeassistant.local",
    ports: [port(22, "ssh", "OpenSSH 9.7"), port(1883, "mqtt", "Mosquitto"), port(8123, "http", null, "Home Assistant")],
    firmware: { kind: "Web", name: "Home Assistant" },
  }),
  dev(21, "Espressif", {
    type: "ESPHome device",
    mdnsName: "kitchen-sensor.local",
    ports: [port(80, "http"), port(6053, "esphome")],
    firmware: { kind: "ESPHome", name: "kitchen-sensor", details: { comment: "Temperature + humidity", ota: true } },
  }),
  dev(22, "Espressif", {
    type: "ESPHome device",
    mdnsName: "garage-door.local",
    ports: [port(80, "http"), port(6053, "esphome")],
    firmware: { kind: "ESPHome", name: "garage-door", details: { comment: "Relay + reed switch", ota: true } },
  }),
  dev(23, "Espressif", {
    type: "WLED device",
    ports: [port(80, "http", null, "WLED")],
    firmware: { kind: "WLED", name: "Shelf LEDs", version: "0.15.1", model: "esp32", details: { leds: 120 } },
  }),
  dev(24, "Espressif", {
    type: "PixelIt device",
    ports: [port(80, "http", null, "PixelIt WebUI"), port(81, "websocket")],
    firmware: {
      kind: "PixelIt",
      name: "desk-clock",
      version: "3.1.0",
      model: "ESP8266_d1_mini",
      id: "PixelIt-1234567",
      details: { chipID: 1234567, hostname: "desk-clock", rssi: -61 },
    },
  }),
  dev(25, "Espressif", {
    type: "Tasmota device",
    ports: [port(80, "http", null, "Tasmota")],
    firmware: { kind: "Tasmota", name: "Coffee Machine", version: "14.3.0", model: "ESP8266EX", details: { module: 1 } },
  }),
  dev(30, "Espressif", {
    type: "Tuya smart device",
    ports: [port(6668, "tuya")],
    firmware: { kind: "Tuya", version: "protocol 3.3", model: "keyexample3x2a", id: "bf0123456789abcdefgh", details: { encrypted: true } },
  }),
  dev(31, "Espressif", {
    type: "Tuya smart device",
    ports: [port(6668, "tuya")],
    firmware: { kind: "Tuya", version: "protocol 3.3", model: "keyexample3x2a", id: "bf9876543210zyxwvuts", details: { encrypted: true } },
  }),
  dev(40, "Shelly", {
    type: "Shelly device",
    ports: [port(80, "http")],
    firmware: { kind: "Shelly", name: "Hallway light", version: "1.4.4", model: "SNSW-001X16EU", id: "shellyplus1-a1b2c3" },
  }),
  dev(50, "Seiko Epson", {
    type: "Printer",
    mdnsName: "EPSON-ET-2850.local",
    ports: [port(80, "http"), port(443, "https"), port(631, "ipp"), port(9100, "jetdirect")],
  }),
  dev(60, "LG Electronics", {
    type: "TV",
    mdnsName: "LG-webOS-TV.local",
    ports: [port(3000, "http"), port(3001, "https"), port(8008, "http"), port(8009, "ajp13")],
  }),
  dev(61, "Apple", {
    type: "Apple TV / HomePod",
    mdnsName: "Living-Room.local",
    ports: [port(5000, "rtsp", "AirTunes rtspd"), port(7000, "rtsp", "AirTunes rtspd"), port(7100, "font-service")],
  }),
  dev(70, "Private (randomized MAC)", {
    randomMac: true,
    type: "iPhone / iPad",
    mdnsName: "Alexs-iPhone.local",
    ports: [port(62078, "iphone-sync")],
  }),
  dev(71, "Apple", {
    type: "Mac",
    mdnsName: "Studio.local",
    ports: [port(22, "ssh", "OpenSSH 9.8"), port(5900, "vnc", "Apple remote desktop vnc")],
  }),
  dev(80, "Hikvision", {
    type: "IP camera",
    ports: [port(80, "http"), port(554, "rtsp"), port(8000, "http-alt")],
  }),
  // offline history
  dev(90, "Private (randomized MAC)", {
    randomMac: true,
    online: false,
    lastSeen: now - 3 * h,
    type: "Phone / laptop (private MAC)",
    mdnsName: "Guest-Pixel.local",
  }),
  dev(91, "Espressif", {
    online: false,
    lastSeen: now - 2 * day,
    type: "ESPHome device",
    firmware: { kind: "ESPHome", name: "balcony-plants" },
  }),
  dev(92, "Amazon Technologies", { online: false, lastSeen: now - 9 * day, type: "Amazon Echo / Fire" }),
];

const state = {
  scan: { running: false, pid: null, phase: "Done", startedAt: now - 9 * min, finishedAt: now - 8 * min, liveCount: 17 },
  network: { iface: "en0", cidr: "192.168.1.0/24", gateway: "192.168.1.1", selfIp: "192.168.1.71" },
  lastFullScanAt: now - 8 * min,
  devices: Object.fromEntries(devices.map((d) => [d.key, d])),
};
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify(state, null, 1));
fs.writeFileSync(path.join(dir, "names.json"), "{}");
console.log(`wrote ${devices.length} demo devices to ${dir}`);
