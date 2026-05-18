import { LocalStorage, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { blocks, percent } from "./lib/progress";
import { getJson } from "./lib/http";

type Prefs = {
  haBaseUrl: string;
  haToken: string;
  haWeightEntityId: string;
  weightStartKg: string;
  weightGoalKg: string;
  refreshSeconds: string;
};

type HaState = {
  state: string;
  attributes?: Record<string, unknown>;
  last_updated?: string;
};

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const refreshMs = Math.max(30, Number(prefs.refreshSeconds || "900")) * 1000;

  const [kg, setKg] = useState<number | null>(null);
  const [prevKg, setPrevKg] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `lifeops.weight.prev.${prefs.haWeightEntityId}`,
    [prefs.haWeightEntityId],
  );

  async function load() {
    try {
      setErr(null);

      const prevRaw = await LocalStorage.getItem<string>(storageKey);
      const prev = prevRaw ? Number(prevRaw) : null;
      setPrevKg(Number.isFinite(prev as number) ? (prev as number) : null);

      const base = prefs.haBaseUrl.replace(/\/$/, "");
      const url = `${base}/api/states/${encodeURIComponent(prefs.haWeightEntityId)}`;
      const data = await getJson<HaState>(url, {
        Authorization: `Bearer ${prefs.haToken}`,
        "Content-Type": "application/json",
      });
      const val = Number(String(data.state).replace(",", "."));
      if (!Number.isFinite(val))
        throw new Error(`Invalid weight state: ${data.state}`);

      setKg(val);
      await LocalStorage.setItem(storageKey, String(val));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), refreshMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.haBaseUrl, prefs.haToken, prefs.haWeightEntityId, refreshMs]);

  const start = Number(prefs.weightStartKg || "113");
  const goal = Number(prefs.weightGoalKg || "85");
  const current = kg ?? start;

  // For weight loss, progress is reversed: start -> goal is decreasing.
  // Our percent() handles decreasing goals too.
  const pct = percent(current, start, goal);
  const title = kg === null ? `KG …` : `KG ${Math.round(pct)}%`;

  return (
    <MenuBarExtra title={title} tooltip="Weight progress (Home Assistant)">
      <MenuBarExtra.Section title="Weight">
        <MenuBarExtra.Item
          title={kg === null ? "Loading…" : `${kg.toFixed(1)} kg`}
        />
        {kg !== null && prevKg !== null ? (
          <MenuBarExtra.Item
            title={(() => {
              const d = kg - prevKg;
              const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "→";
              return `${arrow} ${d >= 0 ? "+" : ""}${d.toFixed(1)} kg since last fetch`;
            })()}
          />
        ) : null}
        <MenuBarExtra.Item title={`${blocks(pct)}  ${pct.toFixed(0)}%`} />
        <MenuBarExtra.Item title={`Start: ${start} kg → Goal: ${goal} kg`} />
      </MenuBarExtra.Section>

      {err ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item title={err} />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}
