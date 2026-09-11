import { runRemote } from "./ssh";
import { getPaths, shQuote, cleanOutput, parseKeyValueLines, extractIpv4, fetchIp } from "./utils";

// === Types ===

export type TrafficVerification = {
  directIp: string | null;
  exitIp: string | null;
  vpnActive: boolean;
};

export type HealthSnapshot = {
  optMounted: boolean;
  optWritable: boolean;
  optFreeMb: string;
  xkeenAvailable: boolean;
  uptime: string;
  activeProfile: string;
};

export type StartupData = {
  statusRaw: string;
  optMounted: boolean;
  optWritable: boolean;
  optFreeMb: string;
  xkeenAvailable: boolean;
  uptime: string;
  activeProfile: string;
};

// === Functions ===

export async function verifyTrafficPath(): Promise<TrafficVerification> {
  const exitPromise = fetchIp("http://2ip.io").then((res) => res || fetchIp("https://2ip.io"));
  const directPromise = runRemote("wget -qO- https://2ip.ru 2>/dev/null || curl -fsS https://2ip.ru 2>/dev/null");
  const [exitIp, directRes] = await Promise.all([exitPromise, directPromise]);
  const directIp = extractIpv4(cleanOutput(directRes.stdout, directRes.stderr).text);
  return {
    directIp,
    exitIp: exitIp ?? null,
    vpnActive: Boolean(directIp && exitIp && directIp !== exitIp),
  };
}

export function formatTrafficVerification(v: TrafficVerification): string {
  const direct = v.directIp ?? "?";
  const exit = v.exitIp ?? "?";
  return v.vpnActive ? `VPN OK (${direct} -> ${exit})` : `Direct/Bypass (${direct} -> ${exit})`;
}

export async function loadStartupData(): Promise<StartupData> {
  const { profilesDir } = getPaths();
  const qProfilesDir = shQuote(profilesDir);
  const { stdout, stderr } = await runRemote(
    `PROFILES_DIR=${qProfilesDir}; ` +
      `STATUS_RAW=$(xkeen -status 2>&1 || true); ` +
      `OPT_MOUNTED=$([ -d /opt/bin ] && echo yes || echo no); ` +
      `OPT_WRITABLE=$([ -w /opt ] && echo yes || echo no); ` +
      `OPT_FREE_MB=$(df -Pm /opt 2>/dev/null | awk 'NR==2{print $4}'); ` +
      `XKEEN_AVAILABLE=$(command -v xkeen >/dev/null 2>&1 && echo yes || echo no); ` +
      `UPTIME=$(uptime 2>/dev/null | tr -s " " || echo "unknown"); ` +
      `ACTIVE_PROFILE=$([ -f "$PROFILES_DIR/.active" ] && cat "$PROFILES_DIR/.active" || echo unknown); ` +
      `echo "___STATUS_START___"; echo "$STATUS_RAW"; echo "___STATUS_END___"; ` +
      `echo "OPT_MOUNTED=$OPT_MOUNTED"; ` +
      `echo "OPT_WRITABLE=$OPT_WRITABLE"; ` +
      `echo "OPT_FREE_MB=$OPT_FREE_MB"; ` +
      `echo "XKEEN_AVAILABLE=$XKEEN_AVAILABLE"; ` +
      `echo "UPTIME=$UPTIME"; ` +
      `echo "ACTIVE_PROFILE=$ACTIVE_PROFILE";`,
  );

  const output = cleanOutput(stdout, stderr).text;
  const statusMatch = output.match(/___STATUS_START___([\s\S]*?)___STATUS_END___/);
  const statusRaw = statusMatch ? statusMatch[1].trim() : output;
  const afterStatus = output.split("___STATUS_END___")[1] || "";
  const kv = parseKeyValueLines(afterStatus);

  return {
    statusRaw,
    optMounted: kv.OPT_MOUNTED === "yes",
    optWritable: kv.OPT_WRITABLE === "yes",
    optFreeMb: kv.OPT_FREE_MB || "unknown",
    xkeenAvailable: kv.XKEEN_AVAILABLE === "yes",
    uptime: kv.UPTIME || "unknown",
    activeProfile: kv.ACTIVE_PROFILE || "unknown",
  };
}
