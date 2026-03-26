import {
  List,
  Action,
  ActionPanel,
  Clipboard,
  showHUD,
  getSelectedText,
  AI,
  useNavigation,
  Detail,
  Icon,
  Color,
  environment,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useAI } from "@raycast/utils";

// ─── transform functions ──────────────────────────────────────────────────────

const transforms: {
  name: string;
  subtitle: string;
  icon: Icon;
  fn: (t: string) => string;
  count?: boolean;
  extract?: boolean;
}[] = [
  // Replace
  { name: "Double Quote → Single Quote", subtitle: "Replace", icon: Icon.Quotes, fn: (t) => t.replace(/"/g, "'") },
  { name: "Single Quote → Double Quote", subtitle: "Replace", icon: Icon.Quotes, fn: (t) => t.replace(/'/g, '"') },
  { name: "Em Dash → Semicolon", subtitle: "Replace", icon: Icon.TextCursor, fn: (t) => t.replace(/—/g, ";") },
  {
    name: "Smart Quotes → Straight",
    subtitle: "Replace",
    icon: Icon.ClearFormatting,
    fn: (t) => t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'),
  },
  // Brackets
  { name: "{ } → [ ]", subtitle: "Brackets", icon: Icon.Code, fn: (t) => t.replace(/\{/g, "[").replace(/\}/g, "]") },
  { name: "[ ] → { }", subtitle: "Brackets", icon: Icon.Code, fn: (t) => t.replace(/\[/g, "{").replace(/\]/g, "}") },
  { name: "{ } → ( )", subtitle: "Brackets", icon: Icon.Code, fn: (t) => t.replace(/\{/g, "(").replace(/\}/g, ")") },
  { name: "( ) → { }", subtitle: "Brackets", icon: Icon.Code, fn: (t) => t.replace(/\(/g, "{").replace(/\)/g, "}") },
  { name: "[ ] → ( )", subtitle: "Brackets", icon: Icon.Code, fn: (t) => t.replace(/\[/g, "(").replace(/\]/g, ")") },
  { name: "( ) → [ ]", subtitle: "Brackets", icon: Icon.Code, fn: (t) => t.replace(/\(/g, "[").replace(/\)/g, "]") },
  // Accents
  {
    name: "Remove Accents",
    subtitle: "Accents",
    icon: Icon.Eraser,
    fn: (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  },
  {
    name: "Accented → HTML Entities",
    subtitle: "Accents",
    icon: Icon.ArrowRight,
    fn: (t) =>
      t
        .replace(/à/g, "&agrave;")
        .replace(/â/g, "&acirc;")
        .replace(/ä/g, "&auml;")
        .replace(/á/g, "&aacute;")
        .replace(/ã/g, "&atilde;")
        .replace(/å/g, "&aring;")
        .replace(/è/g, "&egrave;")
        .replace(/ê/g, "&ecirc;")
        .replace(/ë/g, "&euml;")
        .replace(/é/g, "&eacute;")
        .replace(/î/g, "&icirc;")
        .replace(/ï/g, "&iuml;")
        .replace(/í/g, "&iacute;")
        .replace(/ì/g, "&igrave;")
        .replace(/ô/g, "&ocirc;")
        .replace(/ö/g, "&ouml;")
        .replace(/ó/g, "&oacute;")
        .replace(/ò/g, "&ograve;")
        .replace(/õ/g, "&otilde;")
        .replace(/û/g, "&ucirc;")
        .replace(/ü/g, "&uuml;")
        .replace(/ú/g, "&uacute;")
        .replace(/ù/g, "&ugrave;")
        .replace(/ç/g, "&ccedil;")
        .replace(/ñ/g, "&ntilde;")
        .replace(/À/g, "&Agrave;")
        .replace(/Â/g, "&Acirc;")
        .replace(/Ä/g, "&Auml;")
        .replace(/Á/g, "&Aacute;")
        .replace(/È/g, "&Egrave;")
        .replace(/Ê/g, "&Ecirc;")
        .replace(/Ë/g, "&Euml;")
        .replace(/É/g, "&Eacute;")
        .replace(/Î/g, "&Icirc;")
        .replace(/Ï/g, "&Iuml;")
        .replace(/Í/g, "&Iacute;")
        .replace(/Ô/g, "&Ocirc;")
        .replace(/Ö/g, "&Ouml;")
        .replace(/Ó/g, "&Oacute;")
        .replace(/Û/g, "&Ucirc;")
        .replace(/Ü/g, "&Uuml;")
        .replace(/Ú/g, "&Uacute;")
        .replace(/Ç/g, "&Ccedil;")
        .replace(/Ñ/g, "&Ntilde;"),
  },
  {
    name: "HTML Entities → Accented",
    subtitle: "Accents",
    icon: Icon.ArrowLeft,
    fn: (t) =>
      t
        .replace(/&agrave;/gi, "à")
        .replace(/&acirc;/gi, "â")
        .replace(/&auml;/gi, "ä")
        .replace(/&aacute;/gi, "á")
        .replace(/&atilde;/gi, "ã")
        .replace(/&aring;/gi, "å")
        .replace(/&egrave;/gi, "è")
        .replace(/&ecirc;/gi, "ê")
        .replace(/&euml;/gi, "ë")
        .replace(/&eacute;/gi, "é")
        .replace(/&icirc;/gi, "î")
        .replace(/&iuml;/gi, "ï")
        .replace(/&iacute;/gi, "í")
        .replace(/&igrave;/gi, "ì")
        .replace(/&ocirc;/gi, "ô")
        .replace(/&ouml;/gi, "ö")
        .replace(/&oacute;/gi, "ó")
        .replace(/&ograve;/gi, "ò")
        .replace(/&otilde;/gi, "õ")
        .replace(/&ucirc;/gi, "û")
        .replace(/&uuml;/gi, "ü")
        .replace(/&uacute;/gi, "ú")
        .replace(/&ugrave;/gi, "ù")
        .replace(/&ccedil;/gi, "ç")
        .replace(/&ntilde;/gi, "ñ")
        .replace(/&Agrave;/g, "À")
        .replace(/&Acirc;/g, "Â")
        .replace(/&Auml;/g, "Ä")
        .replace(/&Aacute;/g, "Á")
        .replace(/&Egrave;/g, "È")
        .replace(/&Ecirc;/g, "Ê")
        .replace(/&Euml;/g, "Ë")
        .replace(/&Eacute;/g, "É")
        .replace(/&Icirc;/g, "Î")
        .replace(/&Iuml;/g, "Ï")
        .replace(/&Iacute;/g, "Í")
        .replace(/&Ocirc;/g, "Ô")
        .replace(/&Ouml;/g, "Ö")
        .replace(/&Oacute;/g, "Ó")
        .replace(/&Ucirc;/g, "Û")
        .replace(/&Uuml;/g, "Ü")
        .replace(/&Uacute;/g, "Ú")
        .replace(/&Ccedil;/g, "Ç")
        .replace(/&Ntilde;/g, "Ñ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&apos;/gi, "'")
        .replace(/&nbsp;/gi, " "),
  },
  // HTML
  {
    name: "Encode HTML Special Chars",
    subtitle: "HTML",
    icon: Icon.CodeBlock,
    fn: (t) =>
      t
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;"),
  },
  {
    name: "Decode HTML Special Chars",
    subtitle: "HTML",
    icon: Icon.CodeBlock,
    fn: (t) =>
      t
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&apos;/gi, "'")
        .replace(/&nbsp;/gi, " "),
  },
  {
    name: "URL Encode",
    subtitle: "HTML",
    icon: Icon.Link,
    fn: (t) => encodeURIComponent(t),
  },
  {
    name: "URL Decode",
    subtitle: "HTML",
    icon: Icon.Link,
    fn: (t) => {
      try {
        return decodeURIComponent(t);
      } catch {
        return t;
      }
    },
  },
  // Count
  {
    name: "Count Words",
    subtitle: "Count",
    icon: Icon.Text,
    fn: (t) => String(t.trim().split(/\s+/).filter(Boolean).length),
    count: true,
  },
  {
    name: "Count Letters",
    subtitle: "Count",
    icon: Icon.Text,
    fn: (t) => String(t.replace(/[^a-zA-Z]/g, "").length),
    count: true,
  },
  {
    name: "Count Vowels",
    subtitle: "Count",
    icon: Icon.Text,
    fn: (t) => String((t.match(/[aeiouAEIOU]/g) || []).length),
    count: true,
  },
  {
    name: "Count Consonants",
    subtitle: "Count",
    icon: Icon.Text,
    fn: (t) => String((t.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length),
    count: true,
  },
  {
    name: "Count Spaces",
    subtitle: "Count",
    icon: Icon.Text,
    fn: (t) => String((t.match(/ /g) || []).length),
    count: true,
  },
  { name: "Count Lines", subtitle: "Count", icon: Icon.List, fn: (t) => String(t.split("\n").length), count: true },
  // Extract
  {
    name: "Extract Emails",
    subtitle: "Extract",
    icon: Icon.Envelope,
    fn: (t) => (t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).join("\n"),
    extract: true,
  },
  {
    name: "Extract IPs",
    subtitle: "Extract",
    icon: Icon.Network,
    fn: (t) => (t.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || []).join("\n"),
    extract: true,
  },
  {
    name: "Extract IDs",
    subtitle: "Extract",
    icon: Icon.Fingerprint,
    fn: (t) => (t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b\d{4,}\b/gi) || []).join("\n"),
    extract: true,
  },
  {
    name: "Extract URLs",
    subtitle: "Extract",
    icon: Icon.Globe,
    fn: (t) => (t.match(/https?:\/\/[^\s]+/g) || []).join("\n"),
    extract: true,
  },
  {
    name: "Remove URL Query Params",
    subtitle: "URL",
    icon: Icon.Scissors,
    fn: (t) =>
      t
        .split("\n")
        .map((l) => {
          try {
            const u = new URL(l.trim());
            return u.origin + u.pathname;
          } catch {
            return l;
          }
        })
        .join("\n"),
  },
  // Lines
  { name: "Single → Double Newlines", subtitle: "Lines", icon: Icon.LineChart, fn: (t) => t.replace(/\n/g, "\n\n") },
  { name: "Double → Single Newlines", subtitle: "Lines", icon: Icon.LineChart, fn: (t) => t.replace(/\n{2,}/g, "\n") },
  { name: "Unwrap Lines", subtitle: "Lines", icon: Icon.ArrowsContract, fn: (t) => t.replace(/\n/g, " ") },
  { name: "Sort Lines", subtitle: "Lines", icon: Icon.Filter, fn: (t) => t.split("\n").sort().join("\n") },
  {
    name: "Reverse Lines",
    subtitle: "Lines",
    icon: Icon.ArrowCounterClockwise,
    fn: (t) => t.split("\n").reverse().join("\n"),
  },
  {
    name: "Deduplicate Lines",
    subtitle: "Lines",
    icon: Icon.Duplicate,
    fn: (t) => [...new Set(t.split("\n"))].join("\n"),
  },
  {
    name: "Number Lines",
    subtitle: "Lines",
    icon: Icon.List,
    fn: (t) =>
      t
        .split("\n")
        .map((l, i) => `${i + 1}. ${l}`)
        .join("\n"),
  },
  {
    name: "Remove Line Numbers",
    subtitle: "Lines",
    icon: Icon.MinusCircle,
    fn: (t) =>
      t
        .split("\n")
        .map((l) => l.replace(/^\d+[.)]\s*/, ""))
        .join("\n"),
  },
  // Transform
  {
    name: "Trim Whitespace",
    subtitle: "Transform",
    icon: Icon.Scissors,
    fn: (t) =>
      t
        .split("\n")
        .map((l) => l.trim())
        .join("\n"),
  },
  {
    name: "Remove Empty Lines",
    subtitle: "Transform",
    icon: Icon.Eraser,
    fn: (t) => t.split("\n").filter(Boolean).join("\n"),
  },
  {
    name: "Markdown to Plain Text",
    subtitle: "Transform",
    icon: Icon.Document,
    fn: (t) =>
      t
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"),
  },
  {
    name: "Reverse Text",
    subtitle: "Transform",
    icon: Icon.ArrowCounterClockwise,
    fn: (t) => t.split("").reverse().join(""),
  },
];

// ─── preview util ─────────────────────────────────────────────────────────────

function preview(result: string, isCount: boolean, isExtract: boolean): string {
  if (isCount) return `= ${result}`;
  if (isExtract) {
    const lines = result.split("\n").filter(Boolean);
    return lines.length === 0 ? "none found" : `${lines.length} found`;
  }
  const flat = result.replace(/\n/g, "↵");
  return flat.length > 60 ? flat.slice(0, 60) + "…" : flat;
}

// ─── AI detail view ───────────────────────────────────────────────────────────

function AIDetailView({ input, prompt }: { input: string; prompt: string }) {
  const { data, isLoading } = useAI(`${prompt}\n\nText:\n${input}`, { creativity: 0 });

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? `## Result\n\n${data}` : "Thinking…"}
      actions={
        <ActionPanel>
          {data && (
            <>
              <Action
                title="Paste Result"
                icon={Icon.Text}
                onAction={async () => {
                  await Clipboard.paste(data);
                  await showHUD("Pasted");
                }}
              />
              <Action.CopyToClipboard title="Copy Result" content={data} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

// ─── AI prompts ───────────────────────────────────────────────────────────────

const aiPrompts = [
  { name: "Fix Grammar & Spelling", prompt: "Fix all grammar and spelling errors. Return only the corrected text." },
  { name: "Make More Concise", prompt: "Rewrite this text to be more concise. Return only the rewritten text." },
  { name: "Make More Formal", prompt: "Rewrite this text in a formal tone. Return only the rewritten text." },
  { name: "Make More Casual", prompt: "Rewrite this text in a casual, friendly tone. Return only the rewritten text." },
  { name: "Summarize", prompt: "Summarize this text in 2-3 sentences. Return only the summary." },
  { name: "Bullet Points", prompt: "Convert this text into a concise bullet point list. Return only the list." },
  { name: "Translate to French", prompt: "Translate this text to French. Return only the translation." },
  { name: "Translate to Spanish", prompt: "Translate this text to Spanish. Return only the translation." },
];

// ─── main command ─────────────────────────────────────────────────────────────

export default function Command() {
  const [input, setInput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();
  const canUseAI = environment.canAccess(AI);

  useEffect(() => {
    getSelectedText()
      .then(setInput)
      .catch(() => setError("No text selected — select some text and reopen"));
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title={error} />
      </List>
    );
  }

  const grouped = transforms.reduce<Record<string, typeof transforms>>(
    (acc, t) => ({ ...acc, [t.subtitle]: [...(acc[t.subtitle] || []), t] }),
    {},
  );

  return (
    <List isLoading={input === null} isShowingDetail searchBarPlaceholder="Filter transformations…">
      {canUseAI && (
        <List.Section title="AI">
          {aiPrompts.map((ap) => (
            <List.Item
              key={ap.name}
              icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
              title={ap.name}
              subtitle="AI"
              detail={
                <List.Item.Detail
                  markdown={`**Input**\n\`\`\`\n${(input || "").slice(0, 300)}${(input || "").length > 300 ? "\n…" : ""}\n\`\`\`\n\n*Press Enter to run AI*`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Run AI"
                    icon={Icon.Stars}
                    onAction={() => push(<AIDetailView input={input || ""} prompt={ap.prompt} />)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {Object.entries(grouped).map(([section, items]) => (
        <List.Section key={section} title={section}>
          {items.map((t) => {
            const result = input ? t.fn(input) : "";
            const pre = preview(result, !!t.count, !!t.extract);

            const beforeMd = `**Before**\n\`\`\`\n${(input || "").slice(0, 400)}${(input || "").length > 400 ? "\n…" : ""}\n\`\`\``;
            const afterMd = `**After**\n\`\`\`\n${result.slice(0, 400)}${result.length > 400 ? "\n…" : ""}\n\`\`\``;

            return (
              <List.Item
                key={t.name}
                icon={t.icon}
                title={t.name}
                subtitle={pre}
                detail={<List.Item.Detail markdown={`${beforeMd}\n\n${afterMd}`} />}
                actions={
                  <ActionPanel>
                    {!t.count && !t.extract && (
                      <Action
                        title="Paste Result"
                        icon={Icon.Text}
                        onAction={async () => {
                          await Clipboard.paste(result);
                          await showHUD(t.name);
                        }}
                      />
                    )}
                    <Action.CopyToClipboard
                      title={t.count || t.extract ? "Copy Result" : "Copy to Clipboard"}
                      content={result}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
