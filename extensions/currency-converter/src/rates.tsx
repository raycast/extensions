import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CURRENCIES, getCurrency } from "./currencies";
import { formatRelativeTime, getPrefs, getRates, InvalidApiKeyError, MissingApiKeyError } from "./api";
import NoApiKey from "./NoApiKey";

export default function RatesCommand() {
  const prefs = getPrefs();
  const [base, setBase] = useState<string>(prefs.defaultFrom);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [fetchedAt, setFetchedAt] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [keyState, setKeyState] = useState<"ok" | "missing" | "invalid">("ok");

  async function load(currency: string, force = false) {
    setLoading(true);
    try {
      const data = await getRates(currency);
      setRates(data.rates);
      setFetchedAt(data.fetchedAt);
      setKeyState("ok");
      if (force) {
        await showToast({ style: Toast.Style.Success, title: "Rates refreshed" });
      }
    } catch (e) {
      if (e instanceof MissingApiKeyError) {
        setKeyState("missing");
        return;
      }
      if (e instanceof InvalidApiKeyError) {
        setKeyState("invalid");
        return;
      }
      const message = e instanceof Error ? e.message : String(e);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load rates", message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(base);
  }, [base]);

  if (keyState !== "ok") {
    return <NoApiKey invalid={keyState === "invalid"} />;
  }

  const baseCurrency = getCurrency(base);

  return (
    <List
      isLoading={loading}
      navigationTitle={`Rates — ${base}`}
      searchBarPlaceholder="Filter currencies…"
      searchBarAccessory={
        <List.Dropdown tooltip="Base currency" value={base} onChange={setBase} storeValue>
          {CURRENCIES.map((c) => (
            <List.Dropdown.Item key={c.code} value={c.code} title={`${c.flag} ${c.code} — ${c.name}`} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title={`1 ${baseCurrency?.flag ?? ""} ${base} =`}
        subtitle={fetchedAt ? `Updated ${formatRelativeTime(fetchedAt)}` : undefined}
      >
        {Object.entries(rates)
          .filter(([code]) => code !== base)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([code, rate]) => {
            const c = getCurrency(code);
            return (
              <List.Item
                key={code}
                icon={Icon.Coin}
                title={`${c?.flag ?? ""} ${code}`}
                subtitle={c?.name ?? ""}
                accessories={[{ text: rate.toFixed(6) }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Rate" content={rate.toString()} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => load(base, true)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
