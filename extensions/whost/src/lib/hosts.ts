import { readFileSync, writeFileSync } from "fs";
import { HostEntry, Profile, HOSTS_PATH, MANAGED_START, MANAGED_END } from "./types";
import { elevatedWrite } from "./elevate";
import { flushDns } from "./dns";

export function readHosts(): string {
  try {
    return readFileSync(HOSTS_PATH, "utf8");
  } catch {
    return "";
  }
}

export function parseEntries(text: string): HostEntry[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => {
      const hash = line.indexOf("#");
      let body = line;
      let comment: string | undefined;
      if (hash !== -1) {
        comment = line.slice(hash + 1).trim();
        body = line.slice(0, hash).trim();
      }
      const parts = body.split(/\s+/);
      const ip = parts[0] ?? "";
      const hostname = parts.slice(1).join(" ");
      return { ip, hostname, comment: comment || undefined };
    })
    .filter((e) => e.ip && e.hostname);
}

export function serializeEntries(entries: HostEntry[]): string {
  return entries
    .map((e) => {
      const c = e.comment ? ` # ${e.comment}` : "";
      return `${e.ip}\t${e.hostname}${c}`;
    })
    .join("\n");
}

function buildManagedBlock(profiles: Profile[]): string {
  const lines: string[] = [MANAGED_START];
  for (const p of profiles) {
    lines.push(`# [wHost] ${p.name}`);
    for (const e of p.entries) {
      const c = e.comment ? ` # ${e.comment}` : "";
      const line = `${e.ip}\t${e.hostname}${c}`;
      lines.push(p.enabled ? line : `# ${line}`);
    }
  }
  lines.push(MANAGED_END);
  return lines.join("\n");
}

function spliceManaged(content: string, block: string): string {
  const start = content.indexOf(MANAGED_START);
  const end = content.indexOf(MANAGED_END);
  if (start !== -1 && end !== -1 && end > start) {
    const before = content.slice(0, start).replace(/\n+$/, "");
    const after = content.slice(end + MANAGED_END.length).replace(/^\n+/, "");
    return after ? `${before}\n\n${block}\n${after}\n` : `${before}\n\n${block}\n`;
  }
  const base = content.replace(/\n+$/, "");
  return base ? `${base}\n\n${block}\n` : `${block}\n`;
}

function writeHosts(content: string): void {
  try {
    writeFileSync(HOSTS_PATH, content, "utf8");
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "EPERM" || code === "EACCES") {
      elevatedWrite(content);
    } else {
      throw e;
    }
  }
}

/** Rebuilds the managed block from profiles, writes the hosts file and flushes DNS. */
export function applyProfiles(profiles: Profile[]): void {
  const block = buildManagedBlock(profiles);
  const next = spliceManaged(readHosts(), block);
  writeHosts(next);
  try {
    flushDns();
  } catch {
    /* flushdns failure is non-fatal for the file write */
  }
}
