import { Action, ActionPanel, Detail, Icon, getPreferenceValues, getSelectedText } from "@raycast/api";
import { ReactElement, useEffect, useState } from "react";
import { commafy } from "./lib/commafy";
import { formatWithJapaneseUnits } from "./lib/japanese-units";
import { normalizeDigits } from "./lib/normalize-digits";

type LoadState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready"; selected: string };

export default function PreviewCommafy(): ReactElement {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    getSelectedText()
      .then((text) => {
        if (text) {
          setState({ kind: "ready", selected: text });
        } else {
          setState({ kind: "empty" });
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error && err.message ? err.message : "Could not read the selected text.";
        setState({ kind: "error", message });
      });
  }, []);

  if (state.kind === "loading") {
    return <Detail markdown="Loading selected text…" />;
  }
  if (state.kind === "empty") {
    return (
      <Detail markdown="**No text is selected.**\n\nSelect some text in any application, then re-run this command." />
    );
  }
  if (state.kind === "error") {
    const errFence = safeFence(state.message);
    return <Detail markdown={`**Could not read the selected text.**\n\n${errFence}\n${state.message}\n${errFence}`} />;
  }

  const prefs = getPreferenceValues<Preferences.PreviewCommafy>();
  const minDigits = parseMinDigits(prefs.minDigits);

  // Optionally normalize first.
  const normResult = prefs.normalizeFullWidth ? normalizeDigits(state.selected) : { text: state.selected, count: 0 };

  const commafyResult = commafy(normResult.text, {
    minDigits,
    separator: prefs.separator || ",",
    includeDecimals: prefs.includeDecimals,
    excludeYears: prefs.excludeYears,
    excludeHyphenated: prefs.excludeHyphenated,
  });

  // Show two Japanese variants so the user can pick the style they want.
  const japaneseCompact = formatWithJapaneseUnits(normResult.text, {
    withInternalCommas: false,
    excludeYears: prefs.excludeYears,
    excludeHyphenated: prefs.excludeHyphenated,
  });
  const japaneseWithCommas = formatWithJapaneseUnits(normResult.text, {
    withInternalCommas: true,
    excludeYears: prefs.excludeYears,
    excludeHyphenated: prefs.excludeHyphenated,
  });

  const fence = safeFence(
    [state.selected, commafyResult.text, japaneseCompact.text, japaneseWithCommas.text].join("\n"),
  );

  const normLine =
    normResult.count > 0 ? `_Normalized ${normResult.count} ${plural(normResult.count, "character")} first._\n\n` : "";

  const markdown = [
    "## Original",
    fence,
    state.selected,
    fence,
    "",
    `## Commafy (${commafyResult.count} ${plural(commafyResult.count, "change")})`,
    normLine + fence,
    commafyResult.text,
    fence,
    "",
    `## 万/億 — compact (${japaneseCompact.count} ${plural(japaneseCompact.count, "change")})`,
    fence,
    japaneseCompact.text,
    fence,
    "",
    `## 万/億 — with internal commas (${japaneseWithCommas.count} ${plural(japaneseWithCommas.count, "change")})`,
    fence,
    japaneseWithCommas.text,
    fence,
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Commafy Result" content={commafyResult.text} icon={Icon.TextCursor} />
          <Action.CopyToClipboard title="Copy Commafy Result" content={commafyResult.text} />
          <Action.Paste
            title="Paste 万/億 Compact"
            content={japaneseCompact.text}
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
          />
          <Action.CopyToClipboard title="Copy 万/億 Compact" content={japaneseCompact.text} />
          <Action.Paste
            title="Paste 万/億 with Commas"
            content={japaneseWithCommas.text}
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          />
          <Action.CopyToClipboard title="Copy 万/億 with Commas" content={japaneseWithCommas.text} />
        </ActionPanel>
      }
    />
  );
}

function parseMinDigits(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "4", 10);
  return Number.isFinite(n) && n >= 1 ? n : 4;
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}

/**
 * Return a backtick fence longer than any backtick run in `text`, so that
 * embedding `text` between the fence never breaks the surrounding markdown.
 */
function safeFence(text: string): string {
  const matches = text.match(/`+/g);
  const longest = matches ? matches.reduce((m, run) => Math.max(m, run.length), 0) : 0;
  return "`".repeat(Math.max(3, longest + 1));
}
