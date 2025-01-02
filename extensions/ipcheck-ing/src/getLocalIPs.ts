import { networkInterfaces, NetworkInterfaceInfo } from "os";

interface IPDetail {
  address: string;
  interface: string;
}

export function getLocalIPs(): { ipv4: IPDetail[]; ipv6: IPDetail[] } {
  const ips: { ipv4: IPDetail[]; ipv6: IPDetail[] } = { ipv4: [], ipv6: [] };
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const networks: NetworkInterfaceInfo[] = nets[name] || []; // 增加了 `|| []` 以处理可能为 undefined 的情况
    for (const net of networks) {
      if (!net.internal) {
        if (net.family === "IPv4") {
          ips.ipv4.push({ address: net.address, interface: name });
        } else if (net.family === "IPv6") {
          if (!net.address.startsWith("fe80") && !/^(fc|fd)/.test(net.address)) {
            ips.ipv6.push({ address: net.address, interface: name });
          }
        }
      }
    }
  }
  return ips;
}

export function isLocalIPAddress(ip: string): boolean {
  const localIPv4Ranges = [
    "192.168.",
    "10.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
  ];
  const localIPv6Range = "fc00::";
  if (ip.includes(".")) {
    return localIPv4Ranges.some((range) => ip.startsWith(range));
  }
  return ip.startsWith(localIPv6Range) || ip.startsWith("fe80::");
}
