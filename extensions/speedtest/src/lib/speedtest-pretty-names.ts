import { Color, Icon } from "@raycast/api";
import { SpeedTestResultPrettyNames } from "./speedtest.types";

export type ResultViewIconsListKeys = "interface" | "server" | "ping" | "download" | "upload" | "result";
export type HeaderIcon = { [K in ResultViewIconsListKeys]: { source: Icon; tintColor: Color } };

export const icons: HeaderIcon = {
  interface: { source: Icon.Globe, tintColor: Color.Blue },
  server: { source: Icon.HardDrive, tintColor: Color.Blue },
  ping: { source: Icon.StackedBars2, tintColor: Color.Blue },
  download: { source: Icon.Download, tintColor: Color.Blue },
  upload: { source: Icon.Upload, tintColor: Color.Blue },
  result: { source: Icon.Link, tintColor: Color.Blue },
};

export const speedTestResultPrettyNames: SpeedTestResultPrettyNames = {
  isp: "ISP",
  packetLoss: "Packet Loss",
  bandwidth: "Bandwidth",
  bytes: "Bytes",
  elapsed: "Elapsed",
  high: "High Latency",
  iqm: "IQM",
  jitter: "Jitter",
  low: "Low Latency",
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
