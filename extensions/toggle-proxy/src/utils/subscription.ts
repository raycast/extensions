import { LocalStorage } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { generateXrayConfig, getXrayPath } from "./xray-config";
import { deleteSubRules } from "./routing-rules";

export interface Subscription {
  id: string;
  name: string;
  url: string;
  lastUpdated: string | null;
  serverCount: number;
}

const STORAGE_KEY = "subscriptions";

export async function getSubscriptions(): Promise<Subscription[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveSubscriptions(subs: Subscription[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export async function addSubscription(name: string, url: string): Promise<Subscription> {
  const subs = await getSubscriptions();
  const sub: Subscription = {
    id: crypto.randomUUID(),
    name,
    url,
    lastUpdated: null,
    serverCount: 0,
  };
  subs.push(sub);
  await saveSubscriptions(subs);
  return sub;
}

export async function deleteSubscription(id: string, xrayPathPref?: string): Promise<void> {
  const subs = await getSubscriptions();
  const sub = subs.find((s) => s.id === id);
  if (sub) {
    const subDir = getSubscriptionDir(sub.name, xrayPathPref);
    if (fs.existsSync(subDir)) {
      fs.rmSync(subDir, { recursive: true, force: true });
    }
    await deleteSubRules(slugify(sub.name));
  }
  await saveSubscriptions(subs.filter((s) => s.id !== id));
}

export async function updateSubscription(
  id: string,
  prefs: { host?: string; port?: string; xrayPath?: string },
): Promise<{ serverCount: number }> {
  const subs = await getSubscriptions();
  const sub = subs.find((s) => s.id === id);
  if (!sub) throw new Error("Subscription not found");

  // Fetch subscription content
  const response = await fetch(sub.url);
  if (!response.ok) {
    throw new Error(`Download error: ${response.status} ${response.statusText}`);
  }

  const body = (await response.text()).trim();

  // Try plain text first, then base64
  let lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("vless://"));

  if (lines.length === 0) {
    // Try base64 decode
    const decoded = Buffer.from(body, "base64").toString("utf-8");
    lines = decoded
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("vless://"));
  }

  if (lines.length === 0) {
    throw new Error("Subscription does not contain any VLESS links");
  }

  // Prepare subscription directory
  const subDir = getSubscriptionDir(sub.name, prefs.xrayPath);

  // Clear old configs
  if (fs.existsSync(subDir)) {
    fs.rmSync(subDir, { recursive: true, force: true });
  }
  fs.mkdirSync(subDir, { recursive: true });

  // Generate configs for each VLESS URL
  const usedNames = new Set<string>();

  for (const vlessUrl of lines) {
    try {
      const config = generateXrayConfig(vlessUrl, {
        host: prefs.host,
        port: prefs.port,
      });

      // Extract server name from URL fragment
      const url = new URL(vlessUrl);
      let serverName = url.hash ? decodeURIComponent(url.hash.slice(1)) : url.hostname;
      serverName = sanitizeFileName(serverName);

      // Handle duplicate names
      let finalName = serverName;
      let counter = 1;
      while (usedNames.has(finalName)) {
        finalName = `${serverName}-${counter}`;
        counter++;
      }
      usedNames.add(finalName);

      const configJson = JSON.stringify(config, null, 2);
      fs.writeFileSync(path.join(subDir, `${finalName}.json`), configJson, "utf8");
    } catch (e) {
      // Skip invalid VLESS URLs
      console.log(`Skipping invalid VLESS URL: ${e}`);
    }
  }

  // Update subscription metadata
  sub.lastUpdated = new Date().toISOString();
  sub.serverCount = usedNames.size;
  await saveSubscriptions(subs);

  return { serverCount: usedNames.size };
}

function getSubscriptionDir(subName: string, xrayPathPref?: string): string {
  const xrayPath = getXrayPath(xrayPathPref);
  const slug = slugify(subName);
  return path.join(xrayPath, "subscriptions", slug);
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "subscription"
  );
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "server"
  );
}

export function loadSubscriptionConfigs(
  xrayPathPref?: string,
): Record<string, { displayName: string; relativePath: string }[]> {
  const xrayPath = getXrayPath(xrayPathPref);
  const subsDir = path.join(xrayPath, "subscriptions");
  const result: Record<string, { displayName: string; relativePath: string }[]> = {};

  if (!fs.existsSync(subsDir)) return result;

  try {
    const subFolders = fs.readdirSync(subsDir).filter((f) => {
      try {
        return fs.statSync(path.join(subsDir, f)).isDirectory();
      } catch {
        return false;
      }
    });

    for (const folder of subFolders) {
      const folderPath = path.join(subsDir, folder);
      const jsonFiles = fs
        .readdirSync(folderPath)
        .filter((f) => f.endsWith(".json"))
        .sort();

      if (jsonFiles.length > 0) {
        result[folder] = jsonFiles.map((f) => ({
          displayName: f.replace(".json", ""),
          relativePath: path.join("subscriptions", folder, f),
        }));
      }
    }
  } catch (error) {
    console.log("Error loading subscription configs:", error);
  }

  return result;
}
