import { execFile } from "node:child_process";
import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Primary source: the same fast command used in the shell. */
const PRIMARY_PUBLIC_IP_URL = "https://myip.ipip.net";
const FALLBACK_PUBLIC_IP_URLS = [
  "https://myip.ipip.net",
  "https://ipv4.ipw.cn",
  "http://ip.3322.net",
  "https://cip.cc",
];

const CURL_TIMEOUT_MS = 5_000;
const FETCH_TIMEOUT_MS = 6_000;

export interface LocalIPv4 {
  address: string;
  interfaceName: string;
}

/**
 * Interfaces that are created by Docker, VPNs, virtual machines, AirDrop or
 * other OS services. They must never win over a physical Wi-Fi/Ethernet NIC.
 */
const VIRTUAL_INTERFACE_PATTERNS: RegExp[] = [
  /^utun/i,
  /^bridge/i,
  /^awdl/i,
  /^llw/i,
  /^gif/i,
  /^stf/i,
  /^anpi/i,
  /^ap\d/i,
  /^vmenet/i,
  /^p2p/i,
  /^ipsec/i,
  /^tun/i,
  /^tap/i,
  /^ppp/i,
  /^wg/i,
  /^tailscale/i,
  /^zt/i,
  /^docker/i,
  /^br-/i,
  /^veth/i,
  /^virbr/i,
  /^cni/i,
  /^flannel/i,
  /^tunl/i,
  /^podman/i,
  /^vmnet/i,
  /^vboxnet/i,
  /^vEthernet/i,
  /^hyper-v/i,
  /^loopback/i,
  /^teredo/i,
  /^isatap/i,
  /^bluetooth/i,
  /^npcap/i,
  /^sppp/i,
];

export function isVirtualInterface(interfaceName: string): boolean {
  return VIRTUAL_INTERFACE_PATTERNS.some((pattern) => pattern.test(interfaceName));
}

export function isValidIPv4(value: string): boolean {
  const parts = value.trim().split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

export function isPrivateIPv4(value: string): boolean {
  if (!isValidIPv4(value)) {
    return false;
  }

  const [first, second] = value.split(".").map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

/** Pull the first valid IPv4 address out of a plain text / HTML response. */
export function extractIPv4(text: string): string | null {
  const candidates = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? [];
  return candidates.find(isValidIPv4) ?? null;
}

function interfaceRank(interfaceName: string): number {
  if (/^en0$/i.test(interfaceName)) return 0;
  if (/^en\d+/i.test(interfaceName)) return 1;
  if (/^eth0$/i.test(interfaceName)) return 2;
  if (/^eth\d+/i.test(interfaceName)) return 3;
  if (/^wlan0$/i.test(interfaceName)) return 4;
  if (/^wlan\d+/i.test(interfaceName)) return 5;
  if (/^wi-?fi$/i.test(interfaceName)) return 6;
  if (/^ethernet$/i.test(interfaceName)) return 7;
  return 100;
}

/**
 * Keep only real, private IPv4 addresses on physical interfaces.
 * `interfaces` is injectable so the filtering rules can be tested directly.
 */
export function filterLocalIPv4(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces()): LocalIPv4[] {
  const found: LocalIPv4[] = [];
  const seen = new Set<string>();

  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    if (!addresses || isVirtualInterface(interfaceName)) {
      continue;
    }

    for (const info of addresses) {
      const family = String(info.family);
      if (info.internal || (family !== "IPv4" && family !== "4")) {
        continue;
      }
      if (!isPrivateIPv4(info.address) || seen.has(info.address)) {
        continue;
      }

      seen.add(info.address);
      found.push({ address: info.address, interfaceName });
    }
  }

  return found.sort((left, right) => {
    const rank = interfaceRank(left.interfaceName) - interfaceRank(right.interfaceName);
    return rank !== 0 ? rank : left.interfaceName.localeCompare(right.interfaceName);
  });
}

export function getLocalIPv4(): LocalIPv4[] {
  return filterLocalIPv4();
}

/** The literal two lines the command renders: LAN first, public IP second. */
export function formatIpLines(local: LocalIPv4[], publicIp: string | null): [string, string] {
  const localText = local.length > 0 ? local.map((item) => item.address).join(", ") : "No internal IPv4 found";
  return [`Internal IP: ${localText}`, `External IP: ${publicIp ?? "Fetch failed; press ⌘R to retry"}`];
}

export interface CopyAction {
  target: "external" | "internal";
  title: string;
  content: string;
}

/**
 * Build the copy actions in display order. Raycast uses the first action as the
 * default Enter action, so the external/public IP must come first. The internal
 * IP is deliberately second: Raycast reserves Cmd+Enter for the secondary
 * action, so it needs no explicit shortcut.
 */
export function getCopyActions(localText: string, publicIp: string | null): CopyAction[] {
  const actions: CopyAction[] = [];

  if (publicIp) {
    actions.push({ target: "external", title: "Copy Public IP", content: publicIp });
  }

  if (localText) {
    actions.push({ target: "internal", title: "Copy Internal IP", content: localText });
  }

  return actions;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    return stderr ? `${error.message} (${stderr})` : error.message;
  }
  return String(error);
}

/**
 * Use the exact command from the shell: `curl -s --noproxy '*' https://myip.ipip.net`.
 * `--noproxy '*'` matters because this machine may export HTTP(S)_PROXY; without it
 * curl returns the proxy's egress IP instead of the real broadband IP.
 */
async function fetchWithCurl(url: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "curl",
    ["-s", "-f", "--noproxy", "*", "--max-time", String(Math.ceil(CURL_TIMEOUT_MS / 1000)), "-4", url],
    { timeout: CURL_TIMEOUT_MS + 1_000, maxBuffer: 64 * 1024 },
  );
  return stdout;
}

/** Fallback that does not depend on the curl binary. */
async function fetchWithNode(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "raycast-myip/1.0" },
  });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.text();
}

export async function getPublicIPv4(): Promise<string> {
  const errors: string[] = [];

  // Fast path: the exact method the user verified from the shell.
  try {
    const ip = extractIPv4(await fetchWithCurl(PRIMARY_PUBLIC_IP_URL));
    if (ip) {
      return ip;
    }
    errors.push("curl myip.ipip.net: no IPv4 in response");
  } catch (error) {
    errors.push(`curl myip.ipip.net: ${errorMessage(error)}`);
  }

  // Slow path: query every fallback in parallel so one dead source cannot stall the view.
  const attempts = FALLBACK_PUBLIC_IP_URLS.flatMap((url) => [
    { label: `curl ${url}`, run: () => fetchWithCurl(url) },
    { label: `fetch ${url}`, run: () => fetchWithNode(url) },
  ]);
  const results = await Promise.allSettled(attempts.map((attempt) => attempt.run()));

  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (result.status === "fulfilled") {
      const ip = extractIPv4(result.value);
      if (ip) {
        return ip;
      }
      errors.push(`${attempts[index].label}: no IPv4 in response`);
    } else {
      errors.push(`${attempts[index].label}: ${errorMessage(result.reason)}`);
    }
  }

  throw new Error(`Could not fetch external IP: ${errors.slice(0, 4).join("; ")}`);
}
