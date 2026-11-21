import type { Device } from "@j3lte/govee-lan-controller";
import { GoveeDeviceEventTypes } from "@j3lte/govee-lan-controller";
import { colord } from "colord";
import { useEffect, useReducer, useRef, useState } from "react";

import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, showHUD } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";

import type { Scenario } from "@/types";

import type { CloudDevice } from "@/lib/cloud";
import { visibleColor } from "@/lib/kelvin";
import { sectionOrder } from "@/lib/sections";

import useGoveeController from "@/hooks/useGoveeController";
import useLayout from "@/hooks/useLayout";
import useNameMapping from "@/hooks/useNameMapping";
import useScenarios from "@/hooks/useScenarios";
import useSnapshotColors from "@/hooks/useSnapshotColors";

/**
 * Optional menu bar command (off until you enable it in Raycast): lights with their on/off state,
 * scenarios and snapshots, in the same order and with the same hidden rows as the main list.
 * Menu items can't carry tags, so the colour goes in the icon and the rest in the subtitle.
 *
 * Raycast reopens a menu bar command from its previous menu, and section headers lose their
 * style when sections are added or removed after that. So the last finished menu is cached and
 * drawn straight away with the same structure; fresh data only updates it. Clicks always act on
 * the live lights.
 */

type Kind = "device" | "scenario" | "snapshot";
type Row = { kind: Kind; id: string; title: string; subtitle?: string; icon: string; tint?: string };
type Model = Array<{ key: string; title: string; rows: Row[] }>;

const SECONDARY = "secondary";

// A cloud row is its own cloud device; a LAN row may carry its cloud twin.
const cloudOf = (d: Device) =>
  (d as unknown as { isCloud?: boolean }).isCloud
    ? (d as unknown as CloudDevice)
    : (d as Device & { cloud?: CloudDevice }).cloud;

export default function GoveeMenuBar() {
  const { devices, isLoading, cloudLoading, executeScenario } = useGoveeController();
  const { getName } = useNameMapping();
  const { scenarios, isLoading: scenariosLoading } = useScenarios();
  const layout = useLayout();
  const snapshotColors = useSnapshotColors();

  // Lights change state after they're listed (cloud lights read theirs in the background), and
  // the device list itself doesn't change then, so redraw on every light's state change.
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    devices.forEach((d) => d.on(GoveeDeviceEventTypes.StateChange, redraw));
    return () => devices.forEach((d) => d.off(GoveeDeviceEventTypes.StateChange, redraw));
  }, [devices]);

  // Stay loading until cloud lights have read their state too: Raycast unloads a menu bar command
  // once it stops loading, and would keep a menu that shows them as off.
  const [cloudStatesPending, setCloudStatesPending] = useState(true);
  useEffect(() => {
    let active = true;
    setCloudStatesPending(true);
    const cloud = devices.map((d) => cloudOf(d)).filter((c): c is CloudDevice => !!c);
    Promise.all(cloud.map((c) => c.loaded)).then(() => active && setCloudStatesPending(false));
    return () => {
      active = false;
    };
  }, [devices]);

  const loading = isLoading || cloudLoading || cloudStatesPending || layout.isLoading || scenariosLoading;
  const [cached, setCached] = useCachedState<Model | null>("menu-bar-model", null);

  const prefs = getPreferenceValues<Preferences>();
  const order = sectionOrder({
    devices: prefs.devicesPosition,
    scenarios: prefs.scenariosPosition,
    snapshots: prefs.snapshotsPosition,
    music: "hidden", // music modes need the mic sensitivity setting; they stay in the main list
  });

  const shown = <T extends { id: string }>(items: T[]) => layout.sort(items).filter((i) => !layout.isHidden(i.id));
  const name = (d: Device) => getName(d.id) ?? d.name;
  const nameById = Object.fromEntries(devices.map((d) => [d.id, name(d)]));
  const hasLevels = (d: Device) => (d as Device & { showLevels?: boolean }).showLevels ?? true;

  // What a scenario sets per device (its own value, else "all devices"), as on the scenario rows.
  const summary = (sc: Scenario) => {
    const pick = <K extends "brightness" | "color">(key: K) =>
      sc.devices.map((d) => d.scenario?.[key] ?? sc.all?.[key] ?? null).filter((v) => v !== null);
    const colors = [...new Set(pick("color").map((c) => colord(c).toHex()))];
    const brightness = [...new Set(pick("brightness"))];
    const names = sc.devices.map(({ id }) => nameById[id] ?? "Offline device").join(", ");
    const levels = brightness.length ? brightness.map((b) => `${b}%`).join(" / ") : "";
    return { color: colors[0], subtitle: [names, levels].filter(Boolean).join(" · ") };
  };

  const snapshots = devices.flatMap((d) => {
    const cloud = cloudOf(d);
    if (!cloud) return [];
    return cloud.snapshots.map((s) => ({ id: `${d.id}:${s.value}`, ...s, cloud, deviceName: name(d) }));
  });

  // The menu as plain data, built from live state once everything has loaded.
  const live: Model | null = loading
    ? null
    : order
        .filter((k) => k !== "music")
        .map((k) => {
          if (k === "devices")
            return {
              key: k,
              title: "Devices",
              rows: shown(devices).map((d): Row => {
                const c = visibleColor(d.color, (d as { colorTemperature?: number }).colorTemperature);
                return {
                  kind: "device",
                  id: d.id,
                  title: name(d),
                  subtitle: d.isOn ? (hasLevels(d) ? `On · ${d.brightness}%` : "On") : "Off",
                  icon: d.isOn ? "circle.svg" : Icon.Circle,
                  tint: d.isOn ? colord(c).toHex() : SECONDARY,
                };
              }),
            };
          if (k === "scenarios")
            return {
              key: k,
              title: "Scenarios",
              rows: shown(scenarios).map((sc): Row => {
                const { color, subtitle } = summary(sc);
                return {
                  kind: "scenario",
                  id: sc.id,
                  title: sc.title,
                  subtitle,
                  icon: sc.icon ? Icon[sc.icon] : Icon.CircleFilled,
                  tint: color,
                };
              }),
            };
          return {
            key: k,
            title: "Snapshots",
            rows: shown(snapshots).map((s): Row => {
              const tag = snapshotColors.colorsFor(s.id, s.name).colors[0];
              return {
                kind: "snapshot",
                id: s.id,
                title: s.name,
                subtitle: s.deviceName,
                icon: tag ? "circle.svg" : Icon.Camera,
                tint: tag,
              };
            }),
          };
        });

  const liveJson = live ? JSON.stringify(live) : null;
  useEffect(() => {
    if (liveJson && liveJson !== JSON.stringify(cached)) setCached(JSON.parse(liveJson));
  }, [liveJson]);

  // Clicks act on live lights; a click while still loading waits for them (up to 8 s).
  const latest = useRef({ loading, devices, scenarios, snapshots, executeScenario });
  latest.current = { loading, devices, scenarios, snapshots, executeScenario };
  const ready = async () => {
    for (let t = 0; latest.current.loading && t < 80; t++) await new Promise((r) => setTimeout(r, 100));
    return latest.current;
  };

  const fail = (title: string) => (err: unknown) => showFailureToast(err, { title });

  const run = async (row: Row) => {
    const now = await ready();
    if (row.kind === "device") {
      const d = now.devices.find((x) => x.id === row.id);
      if (!d) return fail(`${row.title} isn't reachable right now`)("");
      try {
        const cloud = d as unknown as { isCloud?: boolean; refresh?: () => Promise<void> };
        if (cloud.isCloud && cloud.refresh) await cloud.refresh().catch(() => undefined); // read before flipping
        if (d.isOn) await d.turnOff();
        else await d.turnOn();
        await showHUD(`${row.title} ${d.isOn ? "on" : "off"}`);
      } catch (err) {
        await fail(`Couldn't switch ${row.title}`)(err);
      }
    } else if (row.kind === "scenario") {
      const sc = now.scenarios.find((x) => x.id === row.id);
      if (!sc) return;
      // The executor from after the wait: it sees the lights found since the click.
      await now
        .executeScenario({ scenario: sc })
        .then(() => showHUD(`${row.title} done`))
        .catch(fail(`Couldn't run ${row.title}`));
    } else {
      const s = now.snapshots.find((x) => x.id === row.id);
      if (!s) return fail(`${row.title} isn't available right now`)("");
      await s.cloud
        .applySnapshot(s.value)
        .then(() => showHUD(`${row.title} applied`))
        .catch(fail("Couldn't apply snapshot"));
    }
  };

  const model = live ?? cached;
  const tint = (t?: string) => (t === SECONDARY ? Color.SecondaryText : (t ?? Color.PrimaryText));

  return (
    <MenuBarExtra icon={{ source: "bulb.svg", tintColor: Color.PrimaryText }} tooltip="Govee" isLoading={loading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Control Govee Lights"
          icon="govee.png"
          onAction={() =>
            launchCommand({ name: "control-govee-lights", type: LaunchType.UserInitiated }).catch((error) =>
              showFailureToast(error, { title: "Could Not Open Govee" }),
            )
          }
        />
      </MenuBarExtra.Section>
      {(model ?? []).map((section) => (
        <MenuBarExtra.Section key={section.key} title={section.title}>
          {section.rows.map((row) => (
            <MenuBarExtra.Item
              key={`${row.kind}-${row.id}`}
              title={row.title}
              subtitle={row.subtitle}
              icon={{ source: row.icon, tintColor: tint(row.tint) }}
              tooltip={row.kind === "device" ? `Click to turn ${row.subtitle === "Off" ? "on" : "off"}` : undefined}
              onAction={() => run(row)}
            />
          ))}
        </MenuBarExtra.Section>
      ))}
    </MenuBarExtra>
  );
}
