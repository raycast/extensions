import { spawn, execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { Tunnel, STATE_FILE, LOG_DIR, ensureDirs } from "./store";

export type Status = "running" | "stopped";

type StateEntry = { pid: number; spec: string; startedAt: number };
type State = Record<string, StateEntry>;

/**
 * Raycast tidak selalu mewarisi PATH dari shell, jadi jangan mengandalkan "ssh"
 * saja. Cek lokasi bakunya dulu.
 */
const SSH_BIN =
  ["/usr/bin/ssh", "/opt/homebrew/bin/ssh", "/usr/local/bin/ssh"].find((p) =>
    fs.existsSync(p),
  ) ?? "ssh";

export function forwardSpec(t: Tunnel): string {
  return `${t.localPort}:${t.remoteHost || "localhost"}:${t.remotePort}`;
}

export function logPath(id: string): string {
  return path.join(LOG_DIR, `${id}.log`);
}

function readState(): State {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as State;
  } catch {
    return {};
  }
}

function writeState(state: State): void {
  ensureDirs();
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

/** Proses dengan PID ini masih hidup? Sinyal 0 hanya mengecek, tidak mengirim apa pun. */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * PID bisa dipakai ulang oleh proses lain setelah ssh mati, jadi cocokkan juga
 * baris perintahnya. Tanpa ini, tunnel bisa terlihat "running" padahal PID-nya
 * sudah jadi milik program lain.
 */
function pidMatchesSpec(pid: number, spec: string): boolean {
  try {
    const out = execFileSync("/bin/ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf-8",
    });
    return out.includes("ssh") && out.includes(spec);
  } catch {
    return false;
  }
}

export function getStatus(t: Tunnel): Status {
  const entry = readState()[t.id];
  if (!entry) return "stopped";
  if (pidAlive(entry.pid) && pidMatchesSpec(entry.pid, entry.spec))
    return "running";

  // Catatan basi — bersihkan supaya tidak menumpuk.
  const state = readState();
  delete state[t.id];
  writeState(state);
  return "stopped";
}

export function getPid(t: Tunnel): number | undefined {
  return readState()[t.id]?.pid;
}

export function buildArgs(t: Tunnel): string[] {
  const args: string[] = [];
  if (t.sshPort) args.push("-p", String(t.sshPort));
  if (t.compression) args.push("-C");
  args.push("-N", "-L", forwardSpec(t));
  args.push(
    // Tidak ada terminal untuk mengetik password, jadi paksa mode non-interaktif
    // supaya kegagalan auth muncul sebagai error, bukan menggantung.
    "-o",
    "BatchMode=yes",
    // Kalau port lokal sudah dipakai, matikan ssh daripada terlihat berhasil.
    "-o",
    "ExitOnForwardFailure=yes",
    // Deteksi koneksi yang mati diam-diam.
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=3",
  );
  if (t.extraArgs) args.push(...t.extraArgs.split(" ").filter(Boolean));
  args.push(t.sshTarget);
  return args;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Menjalankan ssh lepas dari Raycast (detached + unref), supaya tunnel tetap
 * hidup setelah jendela Raycast ditutup.
 */
export async function startTunnel(t: Tunnel): Promise<void> {
  if (getStatus(t) === "running") return;

  ensureDirs();
  const args = buildArgs(t);
  fs.writeFileSync(logPath(t.id), `$ ssh ${args.join(" ")}\n`);

  const out = fs.openSync(logPath(t.id), "a");
  const proc = spawn(SSH_BIN, args, {
    detached: true,
    stdio: ["ignore", out, out],
  });
  proc.unref();
  fs.closeSync(out);

  if (!proc.pid) throw new Error("ssh gagal dijalankan");

  const state = readState();
  state[t.id] = { pid: proc.pid, spec: forwardSpec(t), startedAt: Date.now() };
  writeState(state);

  // ssh yang gagal biasanya mati dalam waktu di bawah satu detik. Beri jeda,
  // lalu laporkan alasannya dari log alih-alih membiarkan status salah.
  await sleep(1200);
  if (!pidAlive(proc.pid)) {
    const reason = readLog(t.id, 5).trim().split("\n").pop() ?? "";
    const cleaned = readState();
    delete cleaned[t.id];
    writeState(cleaned);
    throw new Error(
      reason || "ssh langsung berhenti — lihat log untuk detailnya",
    );
  }
}

export async function stopTunnel(t: Tunnel): Promise<void> {
  const entry = readState()[t.id];
  if (!entry) return;

  try {
    process.kill(entry.pid, "SIGTERM");
  } catch {
    // Sudah mati duluan — tidak apa-apa.
  }

  for (let i = 0; i < 20 && pidAlive(entry.pid); i++) await sleep(100);
  if (pidAlive(entry.pid)) {
    try {
      process.kill(entry.pid, "SIGKILL");
    } catch {
      // abaikan
    }
  }

  const state = readState();
  delete state[t.id];
  writeState(state);
  fs.appendFileSync(
    logPath(t.id),
    `[dihentikan ${new Date().toLocaleString()}]\n`,
  );
}

export async function restartTunnel(t: Tunnel): Promise<void> {
  await stopTunnel(t);
  await startTunnel(t);
}

export function readLog(id: string, lines = 200): string {
  try {
    const all = fs.readFileSync(logPath(id), "utf-8").split("\n");
    return all.slice(-lines).join("\n");
  } catch {
    return "";
  }
}

export function uptime(t: Tunnel): string | undefined {
  const entry = readState()[t.id];
  if (!entry || getStatus(t) !== "running") return undefined;
  const secs = Math.floor((Date.now() - entry.startedAt) / 1000);
  if (secs < 60) return `${secs}d`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  return `${Math.floor(secs / 3600)}j ${Math.floor((secs % 3600) / 60)}m`;
}
