export const INCLUDE_LINE = "Include ~/.ssh/ssh_image_drop_config";

export interface ManagedEntry {
  alias: string;
  hostName: string;
  user: string;
  port: string;
  identityFile?: string;
}

/** Host 라인만 추출 — 키워드 대소문자 무시, 공백·탭 구분 다중 alias, wildcard(*·?)와 negation(!) 제외 */
export function parseHostAliases(content: string): string[] {
  const aliases: string[] = [];
  for (const raw of content.split("\n")) {
    const m = /^\s*host\s+(.+)$/i.exec(raw);
    if (!m) continue;
    const body = m[1].split("#")[0].trim(); // inline comment 절삭
    if (!body) continue;
    for (const token of body.split(/\s+/)) {
      const t = token.replace(/^"|"$/g, "");
      if (!t || t.includes("*") || t.includes("?") || t.startsWith("!"))
        continue;
      aliases.push(t);
    }
  }
  return aliases;
}

const beginMark = (alias: string) => `# >>> ssh-image-drop: ${alias}`;
const endMark = (alias: string) => `# <<< ssh-image-drop: ${alias}`;

export function upsertManagedBlock(content: string, e: ManagedEntry): string {
  const without = removeManagedBlock(content, e.alias);
  const lines = [
    beginMark(e.alias),
    `Host ${e.alias}`,
    `  HostName ${e.hostName}`,
    `  User ${e.user}`,
    `  Port ${e.port}`,
  ];
  if (e.identityFile) {
    lines.push(`  IdentityFile ${e.identityFile}`, "  IdentitiesOnly yes");
  }
  lines.push(endMark(e.alias));
  const base = without.trimEnd();
  return (base ? base + "\n\n" : "") + lines.join("\n") + "\n";
}

export function removeManagedBlock(content: string, alias: string): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of content.split("\n")) {
    if (line.trim() === beginMark(alias)) {
      skipping = true;
      continue;
    }
    if (line.trim() === endMark(alias)) {
      skipping = false;
      continue;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** 메인 config 선두에 Include 1줄 — first-match wins에서 managed 값 우선 보장 */
export function ensureIncludeContent(content: string): {
  content: string;
  changed: boolean;
} {
  const present = content.split("\n").some((l) => l.trim() === INCLUDE_LINE);
  if (present) return { content, changed: false };
  return { content: `${INCLUDE_LINE}\n\n${content}`, changed: true };
}
