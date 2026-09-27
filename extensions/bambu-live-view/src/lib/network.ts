import net from "node:net";

export const RTSPS_PORT = 322;
/** Port used by the P1/A1 series' proprietary JPEG camera stream (not supported). */
const LEGACY_CAMERA_PORT = 6000;

type ProbeResult = { ok: true } | { ok: false; code: string };

function probe(host: string, port: number, timeoutMs: number): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish({ ok: true }));
    socket.once("timeout", () => finish({ ok: false, code: "ETIMEDOUT" }));
    socket.once("error", (err: NodeJS.ErrnoException) => finish({ ok: false, code: err.code ?? "UNKNOWN" }));
    socket.connect(port, host);
  });
}

export interface ConnectionResult {
  ok: boolean;
  /** Short, user-facing summary. */
  title: string;
  /** Longer explanation with likely causes. Never contains the access code. */
  message: string;
}

export async function testConnection(ip: string, timeoutMs = 3000): Promise<ConnectionResult> {
  const result = await probe(ip, RTSPS_PORT, timeoutMs);
  if (result.ok) {
    return {
      ok: true,
      title: "Printer reachable",
      message: `Port ${RTSPS_PORT} on ${ip} is open — the live stream should work.`,
    };
  }

  if (result.code === "ECONNREFUSED") {
    const legacy = await probe(ip, LEGACY_CAMERA_PORT, 1500);
    if (legacy.ok) {
      return {
        ok: false,
        title: "Printer model not supported",
        message:
          `The printer answered on port ${LEGACY_CAMERA_PORT} but not ${RTSPS_PORT}. That looks like a P1P / P1S / A1 / A1 mini, ` +
          "which use a different camera protocol that mpv can't play. Only X1-series, P2S, H2D and similar models are supported.",
      };
    }
    return {
      ok: false,
      title: `Port ${RTSPS_PORT} is closed`,
      message:
        `Something at ${ip} answered, but refused the camera port. Likely causes: LAN Only Liveview is turned off ` +
        "(Settings → LAN Only on the printer), the printer model isn't supported (P1/A1 series), or the IP now belongs to a different device.",
    };
  }

  if (result.code === "ETIMEDOUT" || result.code === "EHOSTUNREACH" || result.code === "EHOSTDOWN") {
    return {
      ok: false,
      title: "Printer not responding",
      message:
        `Nothing answered at ${ip}. Likely causes: the printer is off or asleep, the IP address changed ` +
        "(check Settings → LAN Only on the printer), or your Mac is on a different network / guest Wi-Fi / VPN.",
    };
  }

  if (result.code === "ENETUNREACH") {
    return {
      ok: false,
      title: "Network unreachable",
      message: "Your Mac has no route to that address. Check that you're connected to the same network as the printer.",
    };
  }

  return {
    ok: false,
    title: "Connection failed",
    message: `Couldn't connect to ${ip}:${RTSPS_PORT} (${result.code}).`,
  };
}
