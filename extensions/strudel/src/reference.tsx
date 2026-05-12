import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { reference } from "@strudel/reference";
import { renderAndPlay, stopLive } from "./lib/strudel";

type Param = {
  name: string;
  description?: string;
  type?: { names?: string[] };
};

type DocEntry = {
  name: string;
  longname?: string;
  description?: string;
  kind?: string;
  scope?: string;
  params?: Param[];
  examples?: string[];
  synonyms?: string[];
  tags?: { originalTitle: string; title: string; text: string }[];
  meta?: { filename?: string; path?: string };
};

const PACKAGE_LABELS: Record<string, string> = {
  core: "Core",
  webaudio: "Web Audio",
  tonal: "Tonal",
  superdough: "SuperDough",
  supradough: "SupraDough",
  midi: "MIDI",
  osc: "OSC",
  codemirror: "Editor",
  draw: "Draw",
  csound: "CSound",
  motion: "Motion",
};

const PACKAGE_ORDER = [
  "core",
  "webaudio",
  "tonal",
  "superdough",
  "supradough",
  "midi",
  "osc",
  "codemirror",
  "draw",
  "csound",
  "motion",
];

function pkgFromEntry(entry: DocEntry): string {
  const path = entry.meta?.path ?? "";
  const match = path.match(/packages\/([^/]+)/);
  return match?.[1] ?? "core";
}

function htmlToMd(html: string): string {
  return html
    .replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, c) => `\`\`\`js\n${decodeHtml(c)}\n\`\`\``)
    .replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, c) => `\`\`\`\n${decodeHtml(c)}\n\`\`\``)
    .replace(/<code>([\s\S]*?)<\/code>/gi, (_, c) => `\`${decodeHtml(c)}\``)
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, (_, c) => `**${c}**`)
    .replace(/<em>([\s\S]*?)<\/em>/gi, (_, c) => `*${c}*`)
    .replace(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `[${text}](${href})`)
    .replace(/<li>([\s\S]*?)<\/li>/gi, (_, c) => `- ${c.trim()}\n`)
    .replace(/<\/(ul|ol|p)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMarkdown(entry: DocEntry): string {
  const lines: string[] = [];

  lines.push(`# \`${entry.name}\``);

  const isSuperdirtOnly = entry.tags?.some((t) => t.title === "superdirtonly");
  if (isSuperdirtOnly) {
    lines.push(`> ⚠️ SuperDirt / OSC only`);
  }

  if (entry.description) {
    lines.push("", htmlToMd(entry.description));
  }

  if (entry.synonyms?.length) {
    lines.push("", `**Synonyms:** ${entry.synonyms.map((s) => `\`${s}\``).join(", ")}`);
  }

  if (entry.params?.length) {
    lines.push("", "## Parameters", "");
    lines.push("| Name | Type | Description |");
    lines.push("|------|------|-------------|");
    for (const p of entry.params) {
      const type = p.type?.names?.join(" | ") ?? "";
      const desc = p.description ? plainText(p.description) : "";
      lines.push(`| \`${p.name}\` | \`${type}\` | ${desc} |`);
    }
  }

  if (entry.examples?.length) {
    lines.push("", "## Examples", "");
    for (const ex of entry.examples) {
      lines.push("```js", ex.trim(), "```", "");
    }
  }

  const pkg = pkgFromEntry(entry);
  const pkgLabel = PACKAGE_LABELS[pkg] ?? pkg;
  lines.push("", `---`, `*Package: ${pkgLabel} · Kind: ${entry.kind ?? "unknown"}*`);

  return lines.join("\n");
}

export default function Reference() {
  const docs = (reference as { docs: DocEntry[] }).docs;

  const grouped = new Map<string, DocEntry[]>();
  for (const pkg of PACKAGE_ORDER) grouped.set(pkg, []);

  for (const entry of docs) {
    if (!entry.name || entry.kind === "package") continue;
    const pkg = pkgFromEntry(entry);
    if (!grouped.has(pkg)) grouped.set(pkg, []);
    grouped.get(pkg)!.push(entry);
  }

  return (
    <List isShowingDetail searchBarPlaceholder="Search Strudel functions...">
      {Array.from(grouped.entries())
        .filter(([, entries]) => entries.length > 0)
        .map(([pkg, entries]) => (
          <List.Section key={pkg} title={PACKAGE_LABELS[pkg] ?? pkg} subtitle={`${entries.length}`}>
            {entries.map((entry, i) => (
              <List.Item
                key={`${pkg}/${entry.name}/${i}`}
                icon={Icon.Code}
                title={entry.name}
                subtitle={entry.description ? plainText(entry.description).slice(0, 80) : undefined}
                detail={<List.Item.Detail markdown={buildMarkdown(entry)} />}
                actions={
                  <ActionPanel>
                    {entry.examples?.[0] && (
                      <Action
                        title="Play Example"
                        icon={Icon.Play}
                        onAction={async () => {
                          try {
                            await showToast({ style: Toast.Style.Animated, title: "Rendering..." });
                            await renderAndPlay(entry.examples![0], {}, "reference-preview", false);
                            await showToast({ style: Toast.Style.Success, title: "Playing" });
                          } catch (e) {
                            await showToast({ style: Toast.Style.Failure, title: "Render failed", message: String(e) });
                          }
                        }}
                      />
                    )}
                    {entry.examples?.[0] && (
                      <Action
                        title="Stop"
                        icon={Icon.Stop}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                        onAction={async () => {
                          await stopLive();
                          await showToast({ style: Toast.Style.Success, title: "Stopped" });
                        }}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Name"
                      content={entry.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {entry.examples?.[0] && (
                      <Action.CopyToClipboard
                        title="Copy First Example"
                        content={entry.examples[0]}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
