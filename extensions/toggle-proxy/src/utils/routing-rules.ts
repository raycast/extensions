import { LocalStorage } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { getXrayPath } from "./xray-config";

export type RuleType = "domain" | "ip" | "port";
export type RuleTarget = "direct" | "proxy" | "block";

export interface RoutingRule {
  id: string;
  type: RuleType;
  value: string;
  target: RuleTarget;
  enabled: boolean;
  note?: string;
}

const KEY_PREFIX = "routing_rules_sub_";

function storageKey(subSlug: string): string {
  return `${KEY_PREFIX}${subSlug}`;
}

export async function hasSubRules(subSlug: string): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(storageKey(subSlug));
  return typeof raw === "string";
}

export async function getSubRules(subSlug: string): Promise<RoutingRule[] | null> {
  const raw = await LocalStorage.getItem<string>(storageKey(subSlug));
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as RoutingRule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSubRules(subSlug: string, rules: RoutingRule[]): Promise<void> {
  await LocalStorage.setItem(storageKey(subSlug), JSON.stringify(rules));
}

export async function deleteSubRules(subSlug: string): Promise<void> {
  await LocalStorage.removeItem(storageKey(subSlug));
}

export async function moveSubRule(subSlug: string, id: string, dir: "up" | "down"): Promise<void> {
  const rules = (await getSubRules(subSlug)) ?? [];
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= rules.length) return;
  [rules[idx], rules[swapWith]] = [rules[swapWith], rules[idx]];
  await saveSubRules(subSlug, rules);
}

export function resolveSubSlug(configRelativePath: string): string | null {
  const match = configRelativePath.match(/^subscriptions\/([^/]+)\//);
  return match ? match[1] : null;
}

interface XrayRule {
  type?: string;
  domain?: string[];
  ip?: string[];
  port?: string | number;
  outboundTag?: string;
  [k: string]: unknown;
}

function toRuleTarget(tag: unknown): RuleTarget | null {
  if (tag === "direct" || tag === "proxy" || tag === "block") return tag;
  return null;
}

export async function initializeSubRulesFromBaked(subSlug: string, xrayPathPref?: string): Promise<RoutingRule[]> {
  const xrayDir = getXrayPath(xrayPathPref);
  const subDir = path.join(xrayDir, "subscriptions", subSlug);

  let sampleConfigPath: string | null = null;
  try {
    if (fs.existsSync(subDir)) {
      const files = fs
        .readdirSync(subDir)
        .filter((f) => f.endsWith(".json"))
        .sort();
      if (files.length > 0) sampleConfigPath = path.join(subDir, files[0]);
    }
  } catch {
    // ignore
  }

  const rules: RoutingRule[] = [];

  if (sampleConfigPath) {
    try {
      const raw = fs.readFileSync(sampleConfigPath, "utf-8");
      const cfg = JSON.parse(raw) as { routing?: { rules?: XrayRule[] } };
      const xrayRules = cfg?.routing?.rules ?? [];
      for (const xr of xrayRules) {
        const target = toRuleTarget(xr.outboundTag);
        if (!target) {
          console.log("Skipping rule with unknown outboundTag:", xr.outboundTag);
          continue;
        }
        if (Array.isArray(xr.domain)) {
          for (const v of xr.domain) {
            rules.push({
              id: crypto.randomUUID(),
              type: "domain",
              value: String(v),
              target,
              enabled: true,
            });
          }
        }
        if (Array.isArray(xr.ip)) {
          for (const v of xr.ip) {
            rules.push({
              id: crypto.randomUUID(),
              type: "ip",
              value: String(v),
              target,
              enabled: true,
            });
          }
        }
        if (xr.port !== undefined && xr.port !== null) {
          rules.push({
            id: crypto.randomUUID(),
            type: "port",
            value: String(xr.port),
            target,
            enabled: true,
          });
        }
      }
    } catch (e) {
      console.log("Failed to read baked rules:", e);
    }
  }

  await saveSubRules(subSlug, rules);
  return rules;
}

interface XrayConfig {
  outbounds?: Array<{ protocol?: string; tag?: string; [k: string]: unknown }>;
  routing?: { rules?: XrayRule[]; [k: string]: unknown };
  [k: string]: unknown;
}

export function patchConfigWithSubRules(cfg: unknown, rules: RoutingRule[]): XrayConfig {
  const clone = JSON.parse(JSON.stringify(cfg)) as XrayConfig;

  const enabled = rules.filter((r) => r.enabled);

  const outbounds = Array.isArray(clone.outbounds) ? clone.outbounds : [];
  const hasTag = (tag: string) => outbounds.some((o) => o.tag === tag);

  const ensureOutbound = (target: RuleTarget) => {
    if (hasTag(target)) return true;
    if (target === "direct") {
      outbounds.push({ protocol: "freedom", tag: "direct" });
      return true;
    }
    if (target === "block") {
      outbounds.push({ protocol: "blackhole", tag: "block" });
      return true;
    }
    console.log("Skipping rules targeting 'proxy' — outbound tag 'proxy' not found in config");
    return false;
  };

  const emitted: XrayRule[] = [];
  for (const r of enabled) {
    if (!ensureOutbound(r.target)) continue;
    if (r.type === "domain") {
      emitted.push({ type: "field", domain: [r.value], outboundTag: r.target });
    } else if (r.type === "ip") {
      emitted.push({ type: "field", ip: [r.value], outboundTag: r.target });
    } else if (r.type === "port") {
      emitted.push({ type: "field", port: r.value, outboundTag: r.target });
    }
  }

  clone.outbounds = outbounds;
  clone.routing = { ...(clone.routing ?? {}), rules: emitted };

  return clone;
}
