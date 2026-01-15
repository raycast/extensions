import { execSync } from "child_process";
import https from "https";
import http from "http";
import { ProviderUsage, UsageWindow } from "../types";

interface ProcessInfo {
  pid: number;
  csrfToken: string;
  extensionPort: number;
}

interface QuotaInfo {
  remainingFraction?: number;
  resetTime?: string;
}

interface ModelConfig {
  label: string;
  modelOrAlias?: { model: string };
  quotaInfo?: QuotaInfo;
}

interface UserStatusResponse {
  code?: number | string;
  userStatus?: {
    email?: string;
    planStatus?: {
      planInfo?: {
        planName?: string;
        planDisplayName?: string;
        displayName?: string;
      };
    };
    cascadeModelConfigData?: {
      clientModelConfigs?: ModelConfig[];
    };
  };
}

function findProcess(): ProcessInfo | null {
  try {
    const psOutput = execSync("ps -ax -o pid=,command=", { encoding: "utf-8" });
    const lines = psOutput.split("\n");

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!lower.includes("language_server_macos")) continue;
      if (!lower.includes("antigravity")) continue;

      const pidMatch = line.match(/^\s*(\d+)/);
      const csrfMatch = line.match(/--csrf_token[=\s]+(\S+)/i);
      const portMatch = line.match(/--extension_server_port[=\s]+(\d+)/i);

      if (pidMatch && csrfMatch && portMatch) {
        return {
          pid: parseInt(pidMatch[1], 10),
          csrfToken: csrfMatch[1],
          extensionPort: parseInt(portMatch[1], 10),
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function findListeningPorts(pid: number): number[] {
  const lsofPaths = ["/usr/sbin/lsof", "/usr/bin/lsof"];
  const lsof = lsofPaths.find((p) => {
    try {
      execSync(`test -x ${p}`, { encoding: "utf-8" });
      return true;
    } catch {
      return false;
    }
  });

  if (!lsof) return [];

  try {
    const output = execSync(`${lsof} -nP -iTCP -sTCP:LISTEN -a -p ${pid}`, {
      encoding: "utf-8",
    });

    const ports = new Set<number>();
    const regex = /:(\d+)\s+\(LISTEN\)/g;
    let match;
    while ((match = regex.exec(output)) !== null) {
      ports.add(parseInt(match[1], 10));
    }
    return Array.from(ports).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function makeRequest(
  url: string,
  csrfToken: string,
  body: object,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const lib = isHttps ? https : http;

    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        "Connect-Protocol-Version": "1",
        "X-Codeium-Csrf-Token": csrfToken,
      },
      rejectUnauthorized: false,
      timeout: 8000,
    };

    const req = lib.request(options, (res) => {
      const chunks: Uint8Array[] = [];
      res.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      res.on("end", () => {
        const data = Buffer.concat(chunks);
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });

    req.write(bodyStr);
    req.end();
  });
}

async function probePort(port: number, csrfToken: string): Promise<boolean> {
  const body = {
    context: {
      properties: {
        devMode: "false",
        extensionVersion: "unknown",
        ide: "antigravity",
        ideVersion: "unknown",
        installationId: "raycast",
        os: "macos",
      },
    },
  };

  try {
    await makeRequest(
      `https://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/GetUnleashData`,
      csrfToken,
      body,
    );
    return true;
  } catch {
    return false;
  }
}

async function findWorkingPort(
  ports: number[],
  csrfToken: string,
): Promise<number | null> {
  for (const port of ports) {
    if (await probePort(port, csrfToken)) {
      return port;
    }
  }
  return null;
}

async function fetchUserStatus(
  httpsPort: number,
  httpPort: number,
  csrfToken: string,
): Promise<UserStatusResponse | null> {
  const body = {
    metadata: {
      ideName: "antigravity",
      extensionName: "antigravity",
      ideVersion: "unknown",
      locale: "en",
    },
  };

  const paths = [
    "/exa.language_server_pb.LanguageServerService/GetUserStatus",
    "/exa.language_server_pb.LanguageServerService/GetCommandModelConfigs",
  ];

  for (const path of paths) {
    try {
      const data = await makeRequest(
        `https://127.0.0.1:${httpsPort}${path}`,
        csrfToken,
        body,
      );
      return JSON.parse(data.toString());
    } catch {
      try {
        const data = await makeRequest(
          `http://127.0.0.1:${httpPort}${path}`,
          csrfToken,
          body,
        );
        return JSON.parse(data.toString());
      } catch {
        continue;
      }
    }
  }

  return null;
}

function parseUserStatus(response: UserStatusResponse): {
  windows: UsageWindow[];
  email?: string;
  planName?: string;
} {
  const windows: UsageWindow[] = [];
  const userStatus = response.userStatus;
  const configs = userStatus?.cascadeModelConfigData?.clientModelConfigs ?? [];

  const poolMap = new Map<
    string,
    { models: string[]; remainingFraction: number; resetsAt: Date | null }
  >();

  for (const config of configs) {
    if (config.quotaInfo?.remainingFraction === undefined) continue;

    const resetKey = config.quotaInfo.resetTime ?? "unknown";
    let resetsAt: Date | null = null;

    if (config.quotaInfo.resetTime) {
      const parsed = new Date(config.quotaInfo.resetTime);
      if (!isNaN(parsed.getTime())) {
        resetsAt = parsed;
      } else {
        const seconds = parseFloat(config.quotaInfo.resetTime);
        if (!isNaN(seconds)) {
          resetsAt = new Date(seconds * 1000);
        }
      }
    }

    const existing = poolMap.get(resetKey);
    if (existing) {
      existing.models.push(config.label);
    } else {
      poolMap.set(resetKey, {
        models: [config.label],
        remainingFraction: config.quotaInfo.remainingFraction,
        resetsAt,
      });
    }
  }

  for (const [, pool] of poolMap) {
    const usedPercent = (1 - pool.remainingFraction) * 100;
    const uniqueModels = pool.models
      .map((m) => m.replace(/ \(Thinking\)$/, "").replace(/ \(.*\)$/, ""))
      .filter((v, i, a) => a.indexOf(v) === i);
    const label =
      pool.models.length === 1
        ? pool.models[0]
        : uniqueModels.slice(0, 3).join("\n") +
          (uniqueModels.length > 3 ? `\n+${uniqueModels.length - 3} more` : "");

    windows.push({
      type: "model",
      label,
      used: Math.round(usedPercent),
      limit: 100,
      percentage: usedPercent,
      resetsAt: pool.resetsAt,
    });
  }

  const planInfo = userStatus?.planStatus?.planInfo;
  const planName =
    planInfo?.planDisplayName ||
    planInfo?.displayName ||
    planInfo?.planName ||
    undefined;

  return {
    windows,
    email: userStatus?.email,
    planName,
  };
}

export async function fetchAntigravityUsage(): Promise<ProviderUsage> {
  const baseUsage: ProviderUsage = {
    provider: "antigravity",
    name: "Antigravity",
    icon: "antigravity-icon.png",
    enabled: true,
    authenticated: false,
    lastUpdated: null,
    windows: [],
  };

  const processInfo = findProcess();

  if (!processInfo) {
    return {
      ...baseUsage,
      error: "Antigravity not running. Launch Antigravity and retry.",
    };
  }

  const ports = findListeningPorts(processInfo.pid);

  if (ports.length === 0) {
    return {
      ...baseUsage,
      error: "Antigravity is starting up. Try again in a few seconds.",
    };
  }

  const httpsPort = await findWorkingPort(ports, processInfo.csrfToken);

  if (!httpsPort) {
    return {
      ...baseUsage,
      error: "Could not connect to Antigravity API.",
    };
  }

  const response = await fetchUserStatus(
    httpsPort,
    processInfo.extensionPort,
    processInfo.csrfToken,
  );

  if (!response) {
    return {
      ...baseUsage,
      authenticated: true,
      error: "Failed to fetch usage data from Antigravity.",
    };
  }

  const { windows, email, planName } = parseUserStatus(response);

  return {
    ...baseUsage,
    authenticated: true,
    lastUpdated: new Date(),
    windows,
    accountEmail: email,
    planName,
  };
}
