import { execFileSync } from "child_process";
import { ProxyAgent } from "proxy-agent";
import { AppSettings } from "../runtime/app-settings";

type ProxyAgentInstance = InstanceType<typeof ProxyAgent>;

function readSystemProxyConfig() {
  try {
    return execFileSync("/usr/sbin/scutil", ["--proxy"], { encoding: "utf8" });
  } catch {
    return "";
  }
}

function readProxyValue(config: string, key: string) {
  const match = config.match(new RegExp(`${key}\\s*:\\s*(.+)`));
  return match?.[1]?.trim() ?? "";
}

function isProxyEnabled(config: string, key: string) {
  return readProxyValue(config, key) === "1";
}

function buildSystemProxyUrl(config: string) {
  if (isProxyEnabled(config, "SOCKSEnable")) {
    const host = readProxyValue(config, "SOCKSProxy");
    const port = readProxyValue(config, "SOCKSPort");
    if (host && port) {
      return `socks5://${host}:${port}`;
    }
  }

  if (isProxyEnabled(config, "HTTPSEnable")) {
    const host = readProxyValue(config, "HTTPSProxy");
    const port = readProxyValue(config, "HTTPSPort");
    if (host && port) {
      return `http://${host}:${port}`;
    }
  }

  if (isProxyEnabled(config, "HTTPEnable")) {
    const host = readProxyValue(config, "HTTPProxy");
    const port = readProxyValue(config, "HTTPPort");
    if (host && port) {
      return `http://${host}:${port}`;
    }
  }

  return "";
}

function buildManualSocksProxyUrl(appSettings: AppSettings) {
  if (!appSettings.proxyHost || !appSettings.proxyPort) {
    return "";
  }

  let auth = "";

  if (appSettings.proxyUsername) {
    auth = `${encodeURIComponent(appSettings.proxyUsername)}`;
    if (appSettings.proxyPassword) {
      auth = `${auth}:${encodeURIComponent(appSettings.proxyPassword)}`;
    }
    auth = `${auth}@`;
  }

  return `socks5://${auth}${appSettings.proxyHost}:${appSettings.proxyPort}`;
}

export function useProxy(appSettings: AppSettings): ProxyAgentInstance | undefined {
  const mode = appSettings.proxyMode ?? (appSettings.useProxy ? "socks5" : "system");
  if (mode === "none") {
    return undefined;
  }

  const proxyUrl =
    mode === "socks5" ? buildManualSocksProxyUrl(appSettings) : buildSystemProxyUrl(readSystemProxyConfig());
  if (!proxyUrl) {
    return undefined;
  }

  return new ProxyAgent({
    getProxyForUrl: () => proxyUrl,
  });
}
