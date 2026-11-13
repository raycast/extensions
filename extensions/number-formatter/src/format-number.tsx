import { Action, ActionPanel, Icon, List, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useMemo, useState } from "react";

import { formatNumber, parseNumber } from "./number-format";

const errorMessages = {
  empty: {
    title: "Type or paste a number",
    description: "See it in grouped, compact, and scientific formats.",
  },
  invalid: {
    title: "That doesn’t look like a number",
    description: "Try digits, decimal or grouping separators, and an optional exponent.",
  },
  "out-of-range": {
    title: "That number is outside the supported range",
    description: "Use a finite number that JavaScript can represent.",
  },
  "precision-loss": {
    title: "That number has too many precise digits",
    description: "Use no more than 15 significant digits.",
  },
} as const;

export default function Command() {
  const { decimalDetail, locale: localeChoice } = getPreferenceValues<Preferences.FormatNumber>();
  const [input, setInput] = useState("");
  const locale = localeChoice === "system" ? Intl.NumberFormat().resolvedOptions().locale : localeChoice;
  const parsed = useMemo(() => parseNumber(input, locale), [input, locale]);
  const results = parsed.ok ? formatNumber(parsed.value, locale, Number(decimalDetail)) : [];
  const emptyState = parsed.ok ? null : errorMessages[parsed.reason];

  return (
    <List filtering={false} onSearchTextChange={setInput} searchBarPlaceholder="Type or paste a number…">
      {emptyState ? (
        <List.EmptyView icon={Icon.Calculator} title={emptyState.title} description={emptyState.description} />
      ) : null}
      {results.map((result) => (
        <List.Item
          key={result.kind}
          id={result.kind}
          title={result.value}
          subtitle={result.label}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={`Copy ${result.label}`} content={result.value} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
