/*
 * Convert to Egyptian Pounds: "100 USD", "$1,299" or "50 €" in EGP at the Central Bank rate, at the best bank to sell
 * to and at the cheapest bank to buy from.
 */
import { Action, ActionPanel, Icon, List, type LaunchProps } from "@raycast/api";
import { useState } from "react";
import { genehConvert, type Basis } from "./lite.js";
import { useFeed } from "./feed";
import { flag } from "./icons";
import { parseAmount } from "./parse";
import { currencyName, genehUrl, lang as prefLang, num, words } from "./words";

export default function Convert(props: LaunchProps<{ arguments: { amount?: string } }>) {
  const l = prefLang();
  const w = words(l);
  const [text, setText] = useState(props.arguments.amount ?? "");
  const { data, isLoading, error } = useFeed();
  const parsed = parseAmount(text);
  const rows: [Basis, string][] = [
    ["cbe", w.atCbe],
    ["buy", w.atBuy],
    ["sell", w.atSell],
  ];

  return (
    <List isLoading={isLoading} searchText={text} onSearchTextChange={setText} searchBarPlaceholder={w.convertHint}>
      {error && !data ? (
        <List.EmptyView icon={Icon.WifiDisabled} title={w.failed} description={w.failedHint} />
      ) : !parsed || !data ? (
        <List.EmptyView icon={Icon.Calculator} title={w.convertEmpty} />
      ) : (
        <List.Section title={`${num(parsed.amount, l)} ${currencyName(parsed.currency, l)}`}>
          {rows.map(([basis, label]) => {
            const egp = genehConvert(data.snap, parsed.amount, parsed.currency, "egp", basis);
            return (
              <List.Item
                key={basis}
                icon={flag(parsed.currency)}
                title={`${num(egp, l)} ${w.egp}`}
                subtitle={label}
                actions={
                  <ActionPanel>
                    {egp != null && <Action.CopyToClipboard title={w.copyResult} content={egp.toFixed(2)} />}
                    <Action.OpenInBrowser title={w.open} url={genehUrl(l, `currencies/${parsed.currency}`)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
