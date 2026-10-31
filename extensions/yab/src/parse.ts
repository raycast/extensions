// Yab's MCP tools answer in plain text meant for agents; these read the
// lines this extension shows. One function a tool, kept next to the tool's
// format (Sources/Fast/McpTools*.swift).

export type MailHit = {
  id: string;
  account: string;
  from: string;
  subject: string;
  snippet: string;
  when: string;
  labels: string[];
};

/** `[account|id] from · subject · snippet · when · labels: a, b` (mail_search). */
export function mailHits(text: string): MailHit[] {
  const out: MailHit[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\[([^\]|]+)\|([^\]]+)\]\s+(.*)$/);
    if (!m) continue;
    const parts = m[3].split(" · ");
    let labels: string[] = [];
    if (parts.length && parts[parts.length - 1].startsWith("labels: ")) {
      labels = parts
        .pop()!
        .slice(8)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const [from = "", subject = "", ...rest] = parts;
    const when = rest.length ? rest.pop()! : "";
    out.push({
      id: `${m[1]}|${m[2]}`,
      account: m[1],
      from,
      subject,
      snippet: rest.join(" · ").replace(/[͏\s]+/g, " ").trim(),
      when,
      labels,
    });
  }
  return out;
}

/** mail_read's thread: the header lines and each <mail> block as Markdown. */
export function mailMarkdown(text: string): string {
  const blocks = [...text.matchAll(/<mail>\n([\s\S]*?)\n<\/mail>/g)].map((m) => m[1]);
  const title = text.match(/^Thread [^:]+: (.*)$/m)?.[1] ?? "";
  const labels = text.match(/^Labels: (.*)$/m)?.[1];
  const parts = blocks.map((b) => {
    const [head, ...body] = b.split("\n\n");
    const field = (k: string) => head.match(new RegExp(`^${k}: (.*)$`, "m"))?.[1];
    const from = (field("From") ?? "").replace(/"/g, "").replace(/</g, "‹").replace(/>/g, "›");
    const date = field("Date");
    const files = field("Files");
    return [
      `**${from}**${date ? `  ·  ${new Date(date).toLocaleString()}` : ""}`,
      files ? `📎 ${files.replace(/\s*\([^)]*\)/g, "")}` : "",
      body.join("\n\n").replace(/^>/gm, "\\>"),
    ]
      .filter(Boolean)
      .join("\n\n");
  });
  const head = [`## ${title}`, labels ? `_${labels}_` : ""].filter(Boolean).join("\n\n");
  return [head, ...parts].join("\n\n---\n\n");
}

export type FileHit = { name: string; about: string; id: string; path?: string };

/** `1. name · from · title · date · size` then `id:` and `path:` lines (files_search). */
export function fileHits(text: string): FileHit[] {
  const out: FileHit[] = [];
  let current: FileHit | undefined;
  for (const line of text.split("\n")) {
    const head = line.match(/^\d+\.\s+(.*)$/);
    if (head) {
      const [name, ...about] = head[1].split(" · ");
      current = { name, about: about.join(" · "), id: "" };
      out.push(current);
      continue;
    }
    const field = line.match(/^\s+(id|path): (.*)$/);
    if (field && current) {
      if (field[1] === "id") current.id = field[2];
      else current.path = field[2];
    }
  }
  return out;
}

export type Purchase = { title: string; detail: string; site?: string; mail?: string; tracking?: string };

/** `- Name: detail · site · mail account|id` (purchases). The first line is the summary. */
export function purchases(text: string): { summary: string; items: Purchase[] } {
  const lines = text.split("\n");
  const summary = lines[0]?.startsWith("- ") ? "" : (lines[0] ?? "");
  const items: Purchase[] = [];
  for (const line of lines) {
    if (!line.startsWith("- ")) continue;
    const parts = line.slice(2).split(" · ");
    const mail = parts.find((p) => p.startsWith("mail "))?.slice(5);
    const tracking = parts.find((p) => /^https?:\/\//.test(p));
    const site = parts.find((p) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(p));
    const first = parts[0];
    const colon = first.indexOf(": ");
    const title = colon > 0 ? first.slice(0, colon) : first;
    const detail = [
      colon > 0 ? first.slice(colon + 2) : "",
      ...parts.slice(1).filter((p) => p !== site && p !== tracking && !p.startsWith("mail ")),
    ]
      .filter(Boolean)
      .join(" · ");
    items.push({ title, detail, site, mail, tracking });
  }
  return { summary, items };
}

export type SessionRow = {
  id: string;
  state: string;
  agent: string;
  title: string;
  prompt?: string;
  started?: string;
  finished?: string;
  waiting?: string;
};

/** `yab session list --json`, or its text lines `id  state  agent  title` from a Yab before --json. */
export function sessions(output: string): SessionRow[] {
  const trimmed = output.trim();
  if (trimmed.startsWith("[")) {
    try {
      const rows = JSON.parse(trimmed) as Record<string, unknown>[];
      return rows.map((r) => ({
        id: String(r.id ?? ""),
        state: String(r.state ?? ""),
        agent: String(r.agent ?? r.cli ?? ""),
        title: String(r.title ?? r.prompt ?? ""),
        started: r.started ? String(r.started) : undefined,
        finished: r.finished ? String(r.finished) : undefined,
        waiting:
          r.waiting === true ? "needs you in Yab" : typeof r.waiting === "string" && r.waiting ? r.waiting : undefined,
      }));
    } catch {
      // Fall through to the text.
    }
  }
  return trimmed
    .split("\n")
    .map((line) => line.split(/\s{2,}/))
    .filter((cols) => cols.length >= 2 && /^[0-9a-f]{4,}$/.test(cols[0]))
    .map(([id, state, name = "", ...prompt]) => ({
      id,
      state,
      agent: "",
      title: name || prompt.join("  "),
      prompt: prompt.join("  "),
    }));
}
