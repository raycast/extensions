import { Icon } from "@raycast/api";
import { SpeedTestResultPrettyNames } from "./speedtest.types";

export type ResultViewIconsListKeys = "result" | "ping" | "download" | "upload" | "interface" | "server";
export type HeaderIcon = { [K in ResultViewIconsListKeys]: { source: Icon } };

export const icons: HeaderIcon = {
  download: { source: Icon.Download },
  upload: { source: Icon.Upload },
  interface: { source: Icon.Globe },
  server: { source: Icon.HardDrive },
  ping: { source: Icon.StackedBars2 },
  result: { source: Icon.Link },
};

export const speedTestResultPrettyNames: SpeedTestResultPrettyNames = {
  isp: "ISP",
  packetLoss: "Packet Loss",
  bandwidth: "Bandwidth",
  bytes: "Bytes",
  elapsed: "Elapsed",
  high: "High",
  iqm: "IQM",
  jitter: "Jitter",
  low: "Low",
  latency: "Latency",
  internalIp: "Internal IP",
  name: "Name",
  macAddr: "Mac Address",
  isVpn: "Is VPN",
  externalIp: "External IP",
  id: "ID",
  host: "Host",
  port: "Port",
  location: "Location",
  country: "Country",
  ip: "IP",
  url: "URL",
  persisted: "Persisted",
  download: "Download",
  interface: "Internet Server Provider",
  ping: "Ping",
  result: "Result",
  progress: "Progress",
  error: "Error",
  server: "Server",
  upload: "Upload",
};
