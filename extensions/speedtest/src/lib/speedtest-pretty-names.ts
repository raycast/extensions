import { Color, Icon } from "@raycast/api";
import { SpeedTestResultPrettyNames } from "./speedtest.types";

export type ResultViewIconsListKeys = "result" | "ping" | "download" | "upload" | "interface" | "server";
export type HeaderIcon = { [K in ResultViewIconsListKeys]: { source: Icon; tintColor: Color | string } };

export const icons: HeaderIcon = {
  download: { source: Icon.ArrowDownCircle, tintColor: Color.Blue },
  upload: { source: Icon.ArrowUpCircle, tintColor: "#bf71ff" },
  interface: { source: Icon.Globe, tintColor: Color.Green },
  server: { source: Icon.HardDrive, tintColor: Color.Green },
  ping: { source: Icon.LevelMeter, tintColor: Color.Blue },
  result: { source: Icon.CheckCircle, tintColor: Color.Blue },
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
