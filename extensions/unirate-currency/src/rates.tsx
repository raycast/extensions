import { useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CurrencyEntry, RatesResponse, fetchLatestRates, getDefaultBase, getDefaultDecimals } from "./unirate";

export default function Command() {
  const defaultBase = useMemo(() => getDefaultBase(), []);
  const decimals = useMemo(() => getDefaultDecimals(), []);

  const [base, setBase] = useState(defaultBase);
  const [currencies, setCurrencies] = useState<CurrencyEntry[]>([]);
  const [data, setData] = useState<RatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    fetchLatestRates(base, controller.signal)
      .then((res) => {
        setData(res);
        const codes = new Set<string>([res.base, ...Object.keys(res.rates)]);
        setCurrencies((prev) => {
          const merged = new Set<string>(prev.map((c) => c.code));
          codes.forEach((c) => merged.add(c));
          return Array.from(merged)
            .sort()
            .map((code) => ({ code }));
        });
        setLoading(false);
      })
      .catch(async (err) => {
        if ((err as Error).name === "AbortError") return;
        await showFailureToast(err, { title: `Could not load rates for ${base}` });
        setLoading(false);
      });

    return () => controller.abort();
  }, [base]);

  const entries = useMemo(() => {
    const rates = data?.rates ?? {};
    return Object.entries(rates)
      .map(([code, rate]) => ({ code, rate }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search currencies (1 ${base} = ?)`}
      searchBarAccessory={
        <List.Dropdown tooltip="Base Currency" value={base} storeValue onChange={setBase}>
          {currencies.map((c) => (
            <List.Dropdown.Item key={c.code} value={c.code} title={c.code} />
          ))}
        </List.Dropdown>
      }
    >
      {entries.length === 0 && !loading ? (
        <List.EmptyView icon={Icon.BankNote} title={`No rates available for ${base}`} />
      ) : (
        entries.map((entry) => (
          <List.Item
            key={entry.code}
            title={entry.code}
            subtitle={`1 ${base} = ${entry.rate.toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })} ${entry.code}`}
            accessories={data?.date ? [{ text: data.date }] : undefined}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Rate" content={String(entry.rate)} />
                <Action.CopyToClipboard
                  title={`Copy "1 ${base} = ${entry.rate} ${entry.code}"`}
                  content={`1 ${base} = ${entry.rate} ${entry.code}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title={`Use ${entry.code} as Base`}
                  icon={Icon.ArrowRight}
                  onAction={() => setBase(entry.code)}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
