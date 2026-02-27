import { CommandExecutionError, execCommand } from "./exec";
import { SystemProxyStatus } from "./types";

const PROXY_BYPASS_DOMAINS = ["localhost", "127.0.0.1", "::1"];
const SCUTIL_BIN = "/usr/sbin/scutil";
const NETWORKSETUP_BIN = "/usr/sbin/networksetup";

export async function getSystemProxyStatus(): Promise<SystemProxyStatus> {
  try {
    const { stdout } = await execCommand(SCUTIL_BIN, ["--proxy"], { timeoutMs: 6000 });
    const httpEnabled = parseProxyFlag(stdout, "HTTPEnable");
    const httpsEnabled = parseProxyFlag(stdout, "HTTPSEnable");
    const socksEnabled = parseProxyFlag(stdout, "SOCKSEnable");

    return {
      enabled: httpEnabled || httpsEnabled || socksEnabled,
      httpEnabled,
      httpsEnabled,
      socksEnabled,
    };
  } catch (error) {
    throw new Error(formatSystemProxyError("Failed to read system proxy status.", error));
  }
}

export async function setSystemProxyEnabled(enabled: boolean, host: string, port: number): Promise<void> {
  const services = await listActiveNetworkServices();
  if (services.length === 0) {
    throw new Error("No enabled network services were found on this Mac.");
  }

  for (const service of services) {
    try {
      if (enabled) {
        await execCommand(NETWORKSETUP_BIN, ["-setwebproxy", service, host, String(port)]);
        await execCommand(NETWORKSETUP_BIN, ["-setsecurewebproxy", service, host, String(port)]);
        await execCommand(NETWORKSETUP_BIN, ["-setsocksfirewallproxy", service, host, String(port)]);
        await execCommand(NETWORKSETUP_BIN, ["-setproxybypassdomains", service, ...PROXY_BYPASS_DOMAINS]);
        await execCommand(NETWORKSETUP_BIN, ["-setwebproxystate", service, "on"]);
        await execCommand(NETWORKSETUP_BIN, ["-setsecurewebproxystate", service, "on"]);
        await execCommand(NETWORKSETUP_BIN, ["-setsocksfirewallproxystate", service, "on"]);
      } else {
        await execCommand(NETWORKSETUP_BIN, ["-setwebproxystate", service, "off"]);
        await execCommand(NETWORKSETUP_BIN, ["-setsecurewebproxystate", service, "off"]);
        await execCommand(NETWORKSETUP_BIN, ["-setsocksfirewallproxystate", service, "off"]);
      }
    } catch (error) {
      const prefix = enabled ? "Failed to enable" : "Failed to disable";
      throw new Error(formatSystemProxyError(`${prefix} system proxy for network service "${service}".`, error));
    }
  }
}

export async function listActiveNetworkServices(): Promise<string[]> {
  try {
    const { stdout } = await execCommand(NETWORKSETUP_BIN, ["-listallnetworkservices"], { timeoutMs: 6000 });

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith("An asterisk"))
      .filter((line) => !line.startsWith("*"));
  } catch (error) {
    throw new Error(formatSystemProxyError("Failed to list network services.", error));
  }
}

function parseProxyFlag(raw: string, key: string): boolean {
  const match = raw.match(new RegExp(`${key}\\s*:\\s*(\\d+)`));
  return match?.[1] === "1";
}

function formatSystemProxyError(summary: string, error: unknown): string {
  if (!(error instanceof CommandExecutionError)) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return `${summary} ${detail}`;
  }

  const detail = error.stderr || error.stdout || error.message;
  const permissionHint =
    detail.includes("You must be root") || detail.includes("Operation not permitted")
      ? " Grant Terminal or Raycast required permissions in macOS settings, then retry."
      : "";

  return `${summary} ${detail}${permissionHint}`;
}
