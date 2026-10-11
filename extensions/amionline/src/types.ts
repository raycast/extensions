export type LayerStatus = "ok" | "warn" | "fail" | "info" | "skip" | "checking";

export interface LayerResult {
  id: string;
  label: string;
  status: LayerStatus;
  detail?: string;
  latencyMs?: number;
}

export type Verdict =
  "CHECKING" | "ONLINE_CERTAIN" | "CAPTIVE_PORTAL" | "DNS_FAILING" | "INTERNET_DOWN" | "LAN_ONLY" | "NO_INTERFACE";

export interface CheckReport {
  verdict: Verdict;
  title: string;
  emoji: string;
  reason: string;
  layers: LayerResult[];
  egressIp?: string;
  checkedAt: number;
}

// title/emoji/color per verdict. `color` maps to a Raycast Color name in ui.ts.
export const VERDICT_META: Record<Verdict, { title: string; emoji: string; color: string }> = {
  CHECKING: { title: "Checking…", emoji: "◍", color: "SecondaryText" },
  ONLINE_CERTAIN: { title: "Online", emoji: "🟢", color: "Green" },
  CAPTIVE_PORTAL: { title: "Sign-in required (captive portal)", emoji: "🟡", color: "Yellow" },
  DNS_FAILING: { title: "Online, DNS not resolving", emoji: "🟠", color: "Orange" },
  INTERNET_DOWN: { title: "No internet", emoji: "🔴", color: "Red" },
  LAN_ONLY: { title: "Router unreachable", emoji: "🔴", color: "Red" },
  NO_INTERFACE: { title: "Not connected", emoji: "⚫", color: "SecondaryText" },
};
