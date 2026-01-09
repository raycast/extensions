import { cmd } from "./exec";

export interface BtDevice {
  address: string;
  name: string;
  connected: boolean;
}

export async function listPairedBluetoothDevices(useSystemProfiler = false): Promise<BtDevice[]> {
  const env = useSystemProfiler ? { BLUEUTIL_USE_SYSTEM_PROFILER: "1" } : undefined;
  const out = await cmd("blueutil", ["--paired", "--format", "json"], env);

  const raw = JSON.parse(out);
  const arr = Array.isArray(raw) ? raw : (raw?.devices ?? raw?.paired ?? []);

  return (arr as Record<string, unknown>[])
    .map((d) => ({
      address: String(d.address ?? d.addr ?? d.mac ?? ""),
      name: String(d.name ?? d.device_name ?? ""),
      connected: d.connected === true || d.connected === 1 || d.is_connected === true || d["connected state"] === 1,
    }))
    .filter((d) => d.address && d.name);
}

export async function isConnected(deviceId: string): Promise<boolean> {
  const out = (await cmd("blueutil", ["--is-connected", deviceId]).catch(() => "")).trim();
  return out === "1" || out.toLowerCase() === "true";
}

export async function connect(deviceId: string): Promise<void> {
  await cmd("blueutil", ["-p", "1"]).catch(() => {
    // ignore - best effort
  });
  await cmd("blueutil", ["--connect", deviceId]).catch(() => {
    // ignore - connection checked separately
  });
}

export async function disconnect(deviceId: string): Promise<void> {
  await cmd("blueutil", ["--disconnect", deviceId]).catch(() => {
    // ignore - best effort
  });
}

export async function waitForConnected(deviceId: string, timeoutMs = 12_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isConnected(deviceId)) {
      return;
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error("Connection timeout");
}
