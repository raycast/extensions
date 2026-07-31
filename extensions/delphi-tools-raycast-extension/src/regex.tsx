import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getCliDebounceDelay } from "./utils/preferences";
import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getSelectedText,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

interface RegexGroup {
  start: number;
  end: number;
  value: string;
}

interface RegexMatch {
  start: number;
  end: number;
  value: string;
  groups: RegexGroup[];
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Regex }>,
) {
  return (
    <RegexCommand
      initialPattern={props.arguments.pattern}
      initialText={props.arguments.text}
    />
  );
}

function RegexCommand({
  initialPattern = "",
  initialText = "",
}: {
  initialPattern?: string;
  initialText?: string;
}) {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();
      setIsDelphitoolsInstalled(status.installed);
    }
    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return (
    <RegexForm
      initialPattern={initialPattern}
      initialText={initialText}
      isCheckingInstall={isDelphitoolsInstalled === undefined}
    />
  );
}

function RegexForm({
  initialPattern,
  initialText,
  isCheckingInstall,
}: {
  initialPattern: string;
  initialText: string;
  isCheckingInstall: boolean;
}) {
  const [values, setValues] = useState({
    pattern: initialPattern,
    text: initialText,
    flagG: true,
    flagI: false,
    flagM: false,
    flagS: false,
    flagX: false,
  });

  const [matches, setMatches] = useState<RegexMatch[]>([]);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const lastToastErrorRef = useRef("");

  useEffect(() => {
    async function hydrateInitialInput() {
      if (initialText) return;
      const input = await getInitialInput();
      if (!input) return;
      setValues((current) => {
        if (current.text) return current;
        return {
          ...current,
          text: input,
        };
      });
    }
    hydrateInitialInput();
  }, [initialText]);

  const activeFlags = [
    values.flagG ? "g" : "",
    values.flagI ? "i" : "",
    values.flagM ? "m" : "",
    values.flagS ? "s" : "",
    values.flagX ? "x" : "",
  ].join("");

  useEffect(() => {
    if (!values.pattern.trim() || !values.text.trim()) {
      setMatches([]);
      setError("");
      lastToastErrorRef.current = "";
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    const timeout = setTimeout(async () => {
      try {
        const nextMatches = await runRegex(
          values.pattern,
          activeFlags,
          values.text,
        );
        setMatches(nextMatches);
        setError("");
        lastToastErrorRef.current = "";
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setMatches([]);

        const toastErrorKey = `${values.pattern}:${activeFlags}:${values.text.length}:${message}`;
        if (lastToastErrorRef.current !== toastErrorKey) {
          lastToastErrorRef.current = toastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: "Regex matching failed",
            message,
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }, getCliDebounceDelay());

    return () => {
      clearTimeout(timeout);
    };
  }, [values.pattern, values.text, activeFlags]);

  return (
    <Form
      isLoading={isCheckingInstall || isProcessing}
      actions={
        <ActionPanel>
          {values.pattern && values.text && !error && (
            <Action.Push
              icon={Icon.Eye}
              title="Show Detailed Results"
              target={
                <RegexDetail
                  pattern={values.pattern}
                  flags={activeFlags}
                  text={values.text}
                  matches={matches}
                  error={error}
                />
              }
            />
          )}
          {matches.length > 0 && (
            <>
              <Action
                icon={Icon.Clipboard}
                title="Copy Matches"
                onAction={async () => {
                  await Clipboard.copy(matches.map((m) => m.value).join("\n"));
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied Matches",
                  });
                }}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy First Match"
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={async () => {
                  await Clipboard.copy(matches[0].value);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied First Match",
                  });
                }}
              />
              <Action
                icon={Icon.Code}
                title="Copy JSON Result"
                shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                onAction={async () => {
                  await Clipboard.copy(JSON.stringify(matches, null, 2));
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied JSON Result",
                  });
                }}
              />
            </>
          )}
          {values.pattern && (
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Pattern"
              content={values.pattern}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          )}
          {values.text && (
            <Action
              icon={Icon.XMarkCircle}
              title="Clear Input"
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={() => {
                setValues((current) => ({
                  ...current,
                  text: "",
                }));
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="pattern"
        title="Pattern"
        placeholder="Rust regex pattern"
        value={values.pattern}
        onChange={(pattern) =>
          setValues((current) => ({
            ...current,
            pattern,
          }))
        }
      />
      <Form.Checkbox
        id="flagG"
        label="Find All (g)"
        value={values.flagG}
        onChange={(flagG) =>
          setValues((current) => ({
            ...current,
            flagG,
          }))
        }
      />
      <Form.Checkbox
        id="flagI"
        label="Case-Insensitive (i)"
        value={values.flagI}
        onChange={(flagI) =>
          setValues((current) => ({
            ...current,
            flagI,
          }))
        }
      />
      <Form.Checkbox
        id="flagM"
        label="Multiline (m)"
        value={values.flagM}
        onChange={(flagM) =>
          setValues((current) => ({
            ...current,
            flagM,
          }))
        }
      />
      <Form.Checkbox
        id="flagS"
        label="Dot-All (s)"
        value={values.flagS}
        onChange={(flagS) =>
          setValues((current) => ({
            ...current,
            flagS,
          }))
        }
      />
      <Form.Checkbox
        id="flagX"
        label="Extended (x)"
        value={values.flagX}
        onChange={(flagX) =>
          setValues((current) => ({
            ...current,
            flagX,
          }))
        }
      />
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Text to match against"
        value={values.text}
        onChange={(text) =>
          setValues((current) => ({
            ...current,
            text,
          }))
        }
      />

      {error ? (
        <Form.Description title="Error" text={error} />
      ) : (
        <>
          <Form.Description
            title="Summary"
            text={
              isProcessing
                ? "Matching..."
                : `${matches.length} match${matches.length === 1 ? "" : "es"} found with flags: ${activeFlags || "(none)"}`
            }
          />
          {matches.length > 0 && (
            <Form.Description title="First Match" text={matches[0].value} />
          )}
        </>
      )}
    </Form>
  );
}

function RegexDetail({
  pattern,
  flags,
  text,
  matches,
  error,
}: {
  pattern: string;
  flags: string;
  text: string;
  matches: RegexMatch[];
  error: string;
}) {
  const markdown = formatDetailMarkdown(text, pattern, flags, matches, error);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Pattern"
            content={pattern}
            icon={Icon.Clipboard}
          />
          {matches.length > 0 && (
            <>
              <Action.CopyToClipboard
                title="Copy Matches"
                content={matches.map((m) => m.value).join("\n")}
                icon={Icon.Clipboard}
              />
              <Action.CopyToClipboard
                title="Copy First Match"
                content={matches[0].value}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <Action.CopyToClipboard
                title="Copy JSON Result"
                content={JSON.stringify(matches, null, 2)}
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

async function runRegex(
  pattern: string,
  flags: string,
  text: string,
): Promise<RegexMatch[]> {
  try {
    const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
      "regex",
      "--json",
      "--quiet",
      "--flags",
      flags,
      pattern,
      text,
    ]);
    const output = stdout.trim();
    if (!output) return [];
    return JSON.parse(output) as RegexMatch[];
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    const errMsg = err.stderr
      ? err.stderr.trim()
      : err.message || String(error);
    throw new Error(errMsg);
  }
}

async function getInitialInput(): Promise<string> {
  try {
    const selectedText = await getSelectedText();
    if (selectedText.trim()) {
      return selectedText;
    }
  } catch {
    // Selection is optional; clipboard is the fallback source.
  }
  return (await Clipboard.readText()) ?? "";
}

function byteOffsetToCharIndex(str: string, byteOffset: number): number {
  const buf = Buffer.from(str, "utf-8");
  if (byteOffset <= 0) return 0;
  if (byteOffset >= buf.length) return str.length;
  const subBuf = buf.subarray(0, byteOffset);
  return subBuf.toString("utf-8").length;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|>-])/g, "\\$1");
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/`/g, "\\`");
}

function getHighlightPreview(text: string, matches: RegexMatch[]): string {
  if (matches.length === 0) {
    return escapeMarkdown(text);
  }

  const charMatches = matches
    .map((m) => ({
      start: byteOffsetToCharIndex(text, m.start),
      end: byteOffsetToCharIndex(text, m.end),
    }))
    .sort((a, b) => a.start - b.start);

  let result = "";
  let lastIdx = 0;

  for (const match of charMatches) {
    if (match.start < lastIdx || match.end < match.start) {
      continue;
    }

    result += escapeMarkdown(text.slice(lastIdx, match.start));

    const matchVal = text.slice(match.start, match.end);
    const lines = matchVal.split("\n");
    const highlightedLines = lines.map((line) =>
      line ? `**${escapeMarkdown(line)}**` : "",
    );
    result += highlightedLines.join("\n");

    lastIdx = match.end;
  }

  result += escapeMarkdown(text.slice(lastIdx));
  return result;
}

function formatDetailMarkdown(
  text: string,
  pattern: string,
  flags: string,
  matches: RegexMatch[],
  error: string,
): string {
  if (error) {
    return `# Regex Error\n\n\`\`\`\n${error}\n\`\`\``;
  }

  const summary = [
    `# Regex Match Results`,
    ``,
    `## Summary`,
    `- **Pattern:** \`${pattern}\``,
    `- **Flags:** \`${flags || "(none)"}\``,
    `- **Match Count:** ${matches.length}`,
  ].join("\n");

  const preview = [
    `## Preview`,
    `> ${getHighlightPreview(text, matches).replace(/\n/g, "\n> ")}`,
  ].join("\n");

  let matchesTable = "## Matches\n\nNo matches found.";
  if (matches.length > 0) {
    const rows = matches.map((m, idx) => {
      const charStart = byteOffsetToCharIndex(text, m.start);
      const charEnd = byteOffsetToCharIndex(text, m.end);
      return `| ${idx + 1} | \`${m.start}-${m.end}\` | \`${charStart}-${charEnd}\` | \`${escapeTableCell(m.value)}\` |`;
    });
    matchesTable = [
      `## Matches`,
      `| # | Bytes | Chars | Matched Text |`,
      `|---|---|---|---|`,
      ...rows,
    ].join("\n");
  }

  let capturesTable = "";
  const capturesRows: string[] = [];
  matches.forEach((m, matchIdx) => {
    if (m.groups && m.groups.length > 0) {
      m.groups.forEach((g, groupIdx) => {
        const charStart = byteOffsetToCharIndex(text, g.start);
        const charEnd = byteOffsetToCharIndex(text, g.end);
        capturesRows.push(
          `| Match ${matchIdx + 1} | Group ${groupIdx + 1} | \`${g.start}-${g.end}\` | \`${charStart}-${charEnd}\` | \`${escapeTableCell(g.value)}\` |`,
        );
      });
    }
  });

  if (capturesRows.length > 0) {
    capturesTable = [
      `## Capture Groups`,
      `| Match | Group | Bytes | Chars | Captured Value |`,
      `|---|---|---|---|---|`,
      ...capturesRows,
    ].join("\n");
  }

  return [summary, preview, matchesTable, capturesTable]
    .filter(Boolean)
    .join("\n\n");
}
