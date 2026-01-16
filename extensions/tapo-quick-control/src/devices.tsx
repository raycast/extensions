import { Action, ActionPanel, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStrings } from "./lib/i18n";
import { getCache, clearCache } from "./lib/storage";
import { getInfo, setPlugPower, setLightPower } from "./lib/tapo";
import { Prefs, DeviceKind } from "./lib/types";

type Row = {
  kind: DeviceKind;
  title: string;
  subtitle: string;
};

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const strings = getStrings(prefs);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const cache = await getCache();

    const kinds: DeviceKind[] = ["P110", "L530"];
    const out: Row[] = [];

    for (const k of kinds) {
      try {
        const info = await getInfo(prefs, k);
        const ip = cache[k]?.ip ?? strings.unknownIp;
        const isOn = Boolean(info?.device_on ?? info?.deviceOn ?? info?.device_on === true);
        out.push({
          kind: k,
          title: k === "P110" ? (prefs.p110Alias || strings.plugTitle) : (prefs.l530Alias || strings.lightTitle),
          subtitle: `${ip} • ${isOn ? strings.on : strings.off}`,
        });
      } catch (e) {
        const ip = cache[k]?.ip ?? strings.noCache;
        out.push({
          kind: k,
          title: k === "P110" ? (prefs.p110Alias || strings.plugTitle) : (prefs.l530Alias || strings.lightTitle),
          subtitle: `${ip} • ${strings.errorPrefix}: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    setRows(out);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <List isLoading={loading}>
      {rows.map((r) => (
        <List.Item
          key={r.kind}
          title={r.title}
          subtitle={r.subtitle}
          accessories={[{ tag: r.kind }]}
          actions={
            <ActionPanel>
              {r.kind === "P110" ? (
                <>
                  <Action title={strings.open} onAction={() => runPlug(prefs, true, refresh, strings)} />
                  <Action title={strings.close} onAction={() => runPlug(prefs, false, refresh, strings)} />
                </>
              ) : (
                <>
                  <Action title={strings.open} onAction={() => runLight(prefs, true, refresh, strings)} />
                  <Action title={strings.close} onAction={() => runLight(prefs, false, refresh, strings)} />
                </>
              )}

              <Action title={strings.refresh} onAction={refresh} />
              <Action
                title={strings.clearCache}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await clearCache();
                  await showToast({ style: Toast.Style.Success, title: strings.cacheCleared });
                  await refresh();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function runPlug(
  prefs: Prefs,
  on: boolean,
  refresh: () => Promise<void>,
  strings: ReturnType<typeof getStrings>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: on ? strings.opening : strings.closing });
  try {
    await setPlugPower(prefs, on);
    toast.style = Toast.Style.Success;
    toast.title = on ? strings.opened : strings.closed;
    await refresh();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = strings.failed;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

async function runLight(
  prefs: Prefs,
  on: boolean,
  refresh: () => Promise<void>,
  strings: ReturnType<typeof getStrings>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: on ? strings.opening : strings.closing });
  try {
    await setLightPower(prefs, on);
    toast.style = Toast.Style.Success;
    toast.title = on ? strings.lightOpened : strings.lightClosed;
    await refresh();
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = strings.failed;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
