import * as path from "path";
import * as os from "os";

export interface XrayConfigOptions {
  host?: string;
  port?: string;
  customCountries?: string;
  customDomains?: string;
  customIPs?: string;
}

export function getXrayPath(xrayPathPref?: string): string {
  const xrayPath = xrayPathPref || "~/xray";
  return xrayPath.startsWith("~") ? path.join(os.homedir(), xrayPath.slice(1)) : xrayPath;
}

export function generateXrayConfig(vlessUrl: string, options: XrayConfigOptions = {}) {
  try {
    const url = new URL(vlessUrl);
    const uuid = url.username;
    const address = url.hostname;
    const port = url.port;
    const params = Object.fromEntries(url.searchParams.entries());
    const userConfig: Record<string, string> = {
      id: uuid,
      encryption: params.encryption || "none",
    };

    if (params.flow) {
      userConfig.flow = params.flow;
    }

    // Base routing rules
    const baseRules: Array<{ type: string; domain?: string[]; port?: string; ip?: string[]; outboundTag: string }> = [
      {
        type: "field",
        domain: ["regexp:.*\\.ru$", "regexp:.*\\.ubuntu\\.com$", "regexp:.*\\.npmjs\\.com$"],
        outboundTag: "direct",
      },
      {
        type: "field",
        port: "22",
        outboundTag: "direct",
      },
      {
        type: "field",
        ip: ["geoip:ru", "geoip:private"],
        outboundTag: "direct",
      },
    ];

    // Add custom routing rules
    if (options.customCountries) {
      const countries = options.customCountries
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c);
      if (countries.length > 0) {
        baseRules.push({
          type: "field",
          ip: countries.map((country) => `geoip:${country}`),
          outboundTag: "direct",
        });
      }
    }

    if (options.customDomains) {
      const domains = options.customDomains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d);
      if (domains.length > 0) {
        baseRules.push({
          type: "field",
          domain: domains,
          outboundTag: "direct",
        });
      }
    }

    if (options.customIPs) {
      const ips = options.customIPs
        .split(",")
        .map((ip) => ip.trim())
        .filter((ip) => ip);
      if (ips.length > 0) {
        baseRules.push({
          type: "field",
          ip: ips,
          outboundTag: "direct",
        });
      }
    }

    const socksPort = parseInt(options.port || "1080", 10);
    const socksHost = options.host || "127.0.0.1";

    return {
      log: {
        loglevel: "warning",
      },
      inbounds: [
        {
          listen: socksHost,
          port: socksPort,
          protocol: "socks",
          settings: {
            auth: "noauth",
            udp: true,
          },
          sniffing: {
            destOverride: ["http", "tls", "quic", "fakedns"],
            enabled: false,
            routeOnly: true,
          },
          tag: "socks",
        },
      ],
      outbounds: [
        {
          protocol: "vless",
          settings: {
            vnext: [
              {
                address,
                port: parseInt(port, 10),
                users: [userConfig],
              },
            ],
          },
          streamSettings: {
            network: params.type || "tcp",
            realitySettings:
              params.security === "reality"
                ? {
                    fingerprint: params.fp || "chrome",
                    publicKey: params.pbk || "",
                    serverName: params.sni || "",
                    shortId: params.sid || undefined,
                  }
                : undefined,
            security: params.security || "none",
            tcpSettings: {},
          },
          tag: "proxy",
        },
        {
          protocol: "freedom",
          tag: "direct",
        },
        {
          protocol: "blackhole",
          tag: "block",
        },
      ],
      routing: {
        rules: baseRules,
      },
    };
  } catch {
    throw new Error("Invalid VLESS config format.");
  }
}
