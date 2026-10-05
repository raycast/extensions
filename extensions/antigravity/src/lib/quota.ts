import { exec } from "child_process";
import { promisify } from "util";
import http from "http";

const execAsync = promisify(exec);

const API_ENDPOINT = "/exa.language_server_pb.LanguageServerService/GetUserStatus";
const HTTP_TIMEOUT_MS = 5000;

export interface QuotaModel {
  label: string;
  modelId: string;
  remainingFraction: number | null;
  remainingPercentage: number | null;
  isExhausted: boolean;
  resetTime: Date | null;
  timeUntilReset: number | null;
  raw: unknown;
}

export interface QuotaGroup {
  key: string;
  models: QuotaModel[];
  remainingPercentage: number | null;
  resetTime: Date | null;
  isExhausted: boolean;
}

export interface ProcessInfo {
  pid: number;
  port: number | null;
  token: string | null;
  cmd: string;
}

function parseProcessLines(stdout: string): ProcessInfo[] {
  if (!stdout) return [];
  const results: ProcessInfo[] = [];
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    const cmd = line.replace(/^\d+\s+\d+\s+/, "");

    const portMatch = cmd.match(/--extension_server_port[=\s]+(\d+)/i) || cmd.match(/--extension_server_port=(\d+)/i);
    const tokenMatch = cmd.match(/--csrf_token[=\s]+([a-zA-Z0-9-]+)/i) || cmd.match(/--csrf_token=([a-zA-Z0-9-]+)/i);
    const appDataOk = /--app_data_dir\s+antigravity\b/i.test(cmd) || /--app_data_dir=antigravity\b/i.test(cmd);

    if (appDataOk) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[0]);

      const port = portMatch ? Number(portMatch[1]) : null;
      const token = tokenMatch ? tokenMatch[1] : null;
      results.push({ pid, port, token, cmd });
    }
  }
  return results;
}

const isWindows = process.platform === "win32";

export async function detectTokenAndPort(): Promise<ProcessInfo[]> {
  try {
    const cmd = isWindows
      ? 'powershell -Command "Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -match \'language_server|antigravity\' } | Select-Object ProcessId, ParentProcessId, CommandLine | ForEach-Object { Write-Output (\\"$($_.ProcessId) $($_.ParentProcessId) $($_.CommandLine)\\") }"'
      : `ps -ww -eo pid,ppid,args | grep -E 'language_server|antigravity' | grep -v grep || true`;
    const { stdout } = await execAsync(cmd, { timeout: 8000 });
    return parseProcessLines(stdout);
  } catch (e) {
    console.error("Error detecting process:", e);
    return [];
  }
}

async function getListeningPorts(pid: number): Promise<number[]> {
  if (isWindows) {
    const cmd = `netstat -ano | findstr "LISTENING" | findstr "${pid}"`;
    try {
      const { stdout } = await execAsync(cmd, { timeout: 8000 });
      const ports: number[] = [];
      const lines = stdout.split("\n").filter(Boolean);
      for (const line of lines) {
        const match = line.match(/:(\d+)\s+/);
        if (match) {
          const port = parseInt(match[1]);
          if (!isNaN(port) && !ports.includes(port)) {
            ports.push(port);
          }
        }
      }
      return ports;
    } catch {
      return [];
    }
  } else {
    const paths = ["/usr/sbin/lsof", "/usr/bin/lsof", "lsof"];
    for (const lsofPath of paths) {
      const cmd = `${lsofPath} -nP -iTCP -sTCP:LISTEN -a -p ${pid} | grep LISTEN | awk '{print $9}' | cut -d: -f2`;
      try {
        const { stdout } = await execAsync(cmd);
        const ports = stdout
          .split("\n")
          .map((p) => parseInt(p.trim()))
          .filter((p) => !isNaN(p));
        if (ports.length > 0) return ports;
      } catch {
        // Try next path
      }
    }
    console.error(`All lsof attempts failed for pid ${pid}`);
    return [];
  }
}

function transmit(
  host: string,
  port: number,
  endpoint: string,
  token: string | null,
  payload: unknown,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload || {});
    const opts: http.RequestOptions = {
      hostname: host || "127.0.0.1",
      port,
      path: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "Connect-Protocol-Version": "1",
        "X-Codeium-Csrf-Token": token || "",
      },
      timeout: HTTP_TIMEOUT_MS,
      agent: false,
    };
    const req = http.request(opts, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Status ${res.statusCode}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`JSON error`));
        }
      });
    });
    req.on("error", (e) => reject(e));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.write(data);
    req.end();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeModels(raw: any): QuotaModel[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawObj = raw as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let arr: any[] = [];

  if (rawObj?.userStatus?.cascadeModelConfigData?.clientModelConfigs) {
    arr = rawObj.userStatus.cascadeModelConfigData.clientModelConfigs;
  } else if (rawObj?.models) {
    arr = rawObj.models;
  } else if (Array.isArray(rawObj)) {
    arr = rawObj;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((m: any) => {
    const qi = m.quotaInfo || m.quota || null;
    const remainingFraction =
      qi?.remainingFraction ?? (typeof m.remainingFraction === "number" ? m.remainingFraction : undefined);
    const remainingPercentage =
      typeof remainingFraction === "number"
        ? Number((remainingFraction * 100).toFixed(2))
        : typeof m.remainingPercentage === "number"
          ? m.remainingPercentage
          : null;
    const resetStr = qi?.resetTime ?? m.resetTime ?? m.reset_time ?? null;
    const resetTime = resetStr ? new Date(resetStr) : null;
    const now = Date.now();
    return {
      label: m.label || m.name || m.model || (m.modelOrAlias && m.modelOrAlias.model) || "unknown",
      modelId: m.modelId || m.model || (m.modelOrAlias && m.modelOrAlias.model) || "unknown",
      remainingFraction: typeof remainingFraction === "number" ? remainingFraction : null,
      remainingPercentage,
      isExhausted: typeof remainingFraction === "number" ? remainingFraction === 0 : !!m.isExhausted,
      resetTime,
      timeUntilReset: resetTime ? resetTime.getTime() - now : null,
      raw: m,
    };
  });
}

export function groupModels(models: QuotaModel[]): QuotaGroup[] {
  const map = new Map<string, QuotaModel[]>();
  for (const m of models) {
    const rf = m.remainingFraction !== null ? m.remainingFraction.toString() : "nf";
    const rt = m.resetTime ? m.resetTime.toISOString() : "nr";
    const key = rf + "|" + rt;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  const groups: QuotaGroup[] = [];
  for (const [key, list] of map.entries()) {
    const validPcts = list.map((x) => x.remainingPercentage).filter((p): p is number => p !== null);
    const remainingPercentage = validPcts.length
      ? Number((validPcts.reduce((a, b) => a + b, 0) / validPcts.length).toFixed(2))
      : null;
    const resetTime = list.find((x) => x.resetTime)?.resetTime ?? null;
    const isExhausted = list.every((x) => x.isExhausted);
    groups.push({ key, models: list, remainingPercentage, resetTime, isExhausted });
  }
  return groups;
}

export async function fetchQuotaData(): Promise<QuotaGroup[]> {
  const processes = await detectTokenAndPort();
  if (processes.length === 0) {
    throw new Error("Could not detect any Antigravity processes.");
  }

  for (const info of processes) {
    const portsToTry = new Set<number>();
    if (info.port) portsToTry.add(info.port);
    const listening = await getListeningPorts(info.pid);
    listening.forEach((p) => portsToTry.add(p));

    if (portsToTry.size === 0) continue;

    const payload = { metadata: { ideName: "local", extensionName: "simple-client", locale: "en" } };

    for (const port of Array.from(portsToTry)) {
      try {
        const raw = await transmit("127.0.0.1", port, API_ENDPOINT, info.token, payload);
        if (raw) {
          const models = normalizeModels(raw);
          if (models.length > 0) {
            return groupModels(models);
          }
        }
      } catch {
        // Ignore probing errors
      }
    }
  }

  throw new Error("Could not fetch data from any process/port.");
}

export function formatDelta(ms: number | null): string {
  if (!ms || ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${seconds}s`;
}

export function getProgressIcon(percentage: number | null) {
  if (percentage === null) return { source: "circle-16", tintColor: "#888888" };

  const p = Math.max(0, Math.min(100, percentage));
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (p / 100) * circumference;

  const color = p <= 10 ? "#FF6363" : p <= 30 ? "#FFCC00" : "#44DD66";

  const svg = `
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="${radius}" fill="none" stroke="${color}" stroke-width="2" opacity="0.2" />
      <circle cx="10" cy="10" r="${radius}" fill="none" stroke="${color}" stroke-width="2"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        stroke-linecap="round"
        transform="rotate(-90 10 10)" />
    </svg>
  `
    .trim()
    .replace(/\s+/g, " ");

  return { source: `data:image/svg+xml,${encodeURIComponent(svg)}` };
}
