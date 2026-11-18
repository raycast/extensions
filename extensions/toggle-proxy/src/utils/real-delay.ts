import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as net from "net";
import * as crypto from "crypto";
import { execa } from "execa";
import { ENV_PATH } from "./exec";

const TEST_URL = "http://www.gstatic.com/generate_204";

export interface BatchEntry {
  key: string;
  configPath: string;
}

interface PreparedEntry {
  entry: BatchEntry;
  port: number;
  outbound: Record<string, unknown>;
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (addr && typeof addr === "object" && "port" in addr) {
        const { port } = addr;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("no port")));
      }
    });
  });
}

async function waitForPortOpen(host: string, port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>((resolve) => {
      const s = new net.Socket();
      let settled = false;
      const finish = (v: boolean) => {
        if (settled) return;
        settled = true;
        s.destroy();
        resolve(v);
      };
      s.setTimeout(200);
      s.once("connect", () => finish(true));
      s.once("timeout", () => finish(false));
      s.once("error", () => finish(false));
      s.connect(port, host);
    });
    if (open) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

async function curlTest(port: number, timeoutMs: number): Promise<number | null> {
  const start = Date.now();
  const result = await execa(
    "curl",
    [
      "--silent",
      "--socks5-hostname",
      `127.0.0.1:${port}`,
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "--max-time",
      String(Math.max(1, Math.floor(timeoutMs / 1000))),
      TEST_URL,
    ],
    { reject: false, env: { ...process.env, PATH: ENV_PATH } },
  );
  const latency = Date.now() - start;
  const httpCode = result.stdout?.trim();
  return httpCode === "204" ? latency : null;
}

export async function realDelayBatch(
  entries: BatchEntry[],
  xrayDir: string,
  opts: {
    timeoutMs?: number;
    parallel?: number;
    startTimeoutMs?: number;
    onResult?: (key: string, latency: number | null) => void;
  } = {},
): Promise<Record<string, number | null>> {
  const { timeoutMs = 3000, parallel = 20, startTimeoutMs = 8000, onResult } = opts;
  const results: Record<string, number | null> = {};
  const prepared: PreparedEntry[] = [];

  for (const entry of entries) {
    try {
      if (!fs.existsSync(entry.configPath)) {
        results[entry.key] = null;
        onResult?.(entry.key, null);
        continue;
      }
      const raw = fs.readFileSync(entry.configPath, "utf-8");
      const cfg = JSON.parse(raw) as { outbounds?: Array<Record<string, unknown>> };
      const out = cfg?.outbounds?.[0];
      if (!out || out.protocol === "freedom" || out.protocol === "blackhole") {
        results[entry.key] = null;
        onResult?.(entry.key, null);
        continue;
      }
      const port = await getFreePort();
      prepared.push({ entry, port, outbound: out });
    } catch {
      results[entry.key] = null;
      onResult?.(entry.key, null);
    }
  }

  if (prepared.length === 0) return results;

  const inbounds = prepared.map(({ port }, i) => ({
    tag: `in-${i}`,
    listen: "127.0.0.1",
    port,
    protocol: "socks",
    settings: { auth: "noauth", udp: true },
  }));

  const outbounds = [
    ...prepared.map(({ outbound }, i) => ({ ...outbound, tag: `out-${i}` })),
    { protocol: "freedom", tag: "direct" },
    { protocol: "blackhole", tag: "block" },
  ];

  const rules = prepared.map((_, i) => ({
    type: "field",
    inboundTag: [`in-${i}`],
    outboundTag: `out-${i}`,
  }));

  const mergedConfig = {
    log: { loglevel: "none" },
    inbounds,
    outbounds,
    routing: { rules },
  };

  const tempConfigPath = path.join(os.tmpdir(), `toggle-proxy-batch-${crypto.randomBytes(4).toString("hex")}.json`);
  fs.writeFileSync(tempConfigPath, JSON.stringify(mergedConfig));

  const xrayBin = fs.existsSync(path.join(xrayDir, "xray")) ? path.join(xrayDir, "xray") : "xray";

  const child = execa(xrayBin, ["-config", tempConfigPath], {
    cwd: xrayDir,
    env: { ...process.env, PATH: ENV_PATH },
    reject: false,
    stdio: "ignore",
  });
  child.catch(() => {
    // prevent unhandled rejection if xray exits early
  });

  const cleanup = () => {
    try {
      if (!child.killed) child.kill("SIGKILL");
    } catch {
      // ignore
    }
    try {
      fs.unlinkSync(tempConfigPath);
    } catch {
      // ignore
    }
  };

  try {
    const firstReady = await waitForPortOpen("127.0.0.1", prepared[0].port, startTimeoutMs);
    if (!firstReady) {
      for (const p of prepared) {
        results[p.entry.key] = null;
        onResult?.(p.entry.key, null);
      }
      return results;
    }

    let idx = 0;
    const workers = Array.from({ length: Math.min(parallel, prepared.length) }, async () => {
      while (idx < prepared.length) {
        const i = idx++;
        const { entry, port } = prepared[i];
        const latency = await curlTest(port, timeoutMs);
        results[entry.key] = latency;
        onResult?.(entry.key, latency);
      }
    });
    await Promise.all(workers);
  } finally {
    cleanup();
  }

  return results;
}
