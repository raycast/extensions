import { LocalStorage, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { blocks, clamp } from "./lib/progress";
import { getJson } from "./lib/http";

type Prefs = {
  fireflyBaseUrl: string;
  fireflyToken: string;
  fireflyAccountIdsCsv: string;
  savingsStartEur: string;
  savingsGoalEur: string;
  refreshSeconds: string;
};

type FireflyAccount = {
  id: string;
  attributes: {
    name: string;
    current_balance: string;
  };
};

type FireflyAccountsResp = {
  data: FireflyAccount[];
};

function parseIds(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const refreshMs = Math.max(30, Number(prefs.refreshSeconds || "900")) * 1000;

  const [eur, setEur] = useState<number | null>(null);
  const [prevEur, setPrevEur] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `lifeops.savings.prev.${prefs.fireflyAccountIdsCsv}`,
    [prefs.fireflyAccountIdsCsv],
  );

  const ids = useMemo(
    () => parseIds(prefs.fireflyAccountIdsCsv || ""),
    [prefs.fireflyAccountIdsCsv],
  );

  async function load() {
    try {
      setErr(null);

      const prevRaw = await LocalStorage.getItem<string>(storageKey);
      const prev = prevRaw ? Number(prevRaw) : null;
      setPrevEur(Number.isFinite(prev as number) ? (prev as number) : null);

      const base = prefs.fireflyBaseUrl.replace(/\/$/, "");
      if (!ids.length) throw new Error("No Firefly account ids configured");

      // Simple approach: fetch accounts index and sum selected balances.
      // Works on default Firefly endpoints; may need tuning per instance.
      const url = `${base}/api/v1/accounts?type=asset`; // token must allow reading
      const data = await getJson<FireflyAccountsResp>(url, {
        Authorization: `Bearer ${prefs.fireflyToken}`,
        Accept: "application/json",
      });

      const selected = data.data.filter((a) => ids.includes(a.id));
      if (!selected.length)
        throw new Error("Configured account ids not found in Firefly response");

      const sum = selected.reduce(
        (acc, a) =>
          acc + Number(String(a.attributes.current_balance).replace(",", ".")),
        0,
      );
      if (!Number.isFinite(sum)) throw new Error("Invalid balance value(s)");
      setEur(sum);
      await LocalStorage.setItem(storageKey, String(sum));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), refreshMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prefs.fireflyBaseUrl,
    prefs.fireflyToken,
    prefs.fireflyAccountIdsCsv,
    refreshMs,
  ]);

  const start = Number(prefs.savingsStartEur || "0");
  const goal = Number(prefs.savingsGoalEur || "20000");
  const current = eur ?? start;

  const pct = clamp(((current - start) / (goal - start)) * 100, 0, 100);
  const title = eur === null ? `TR …` : `TR ${Math.round(pct)}%`;

  return (
    <MenuBarExtra title={title} tooltip="Savings progress (Firefly)">
      <MenuBarExtra.Section title="Savings">
        <MenuBarExtra.Item
          title={eur === null ? "Loading…" : `€ ${current.toFixed(0)}`}
        />
        {eur !== null && prevEur !== null ? (
          <MenuBarExtra.Item
            title={(() => {
              const d = eur - prevEur;
              const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "→";
              return `${arrow} ${d >= 0 ? "+" : ""}€${d.toFixed(0)} since last fetch`;
            })()}
          />
        ) : null}
        <MenuBarExtra.Item title={`${blocks(pct)}  ${pct.toFixed(0)}%`} />
        <MenuBarExtra.Item
          title={`Start: €${start.toFixed(0)} → Goal: €${goal.toFixed(0)}`}
        />
      </MenuBarExtra.Section>

      {err ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item title={err} />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}
