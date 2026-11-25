import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  LocalStorage,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_STYLE, Category, GROUPS, groupFor, hex4, speedFrom } from "./lookups";
import { DeviceDetail, RawProperties, childrenOf, deviceId } from "./detail";
import { ago, json, label, linkDowngraded, powerText, primaryCategory, summary, vidpid } from "./format";
import { pairHubs } from "./hubs";
import { showInSystemInformation } from "./system-information";
import { UsbDevice, ejectDisk, listUsbDevices, usbFingerprint } from "./usb";

const POLL_MS = 2000;
const GONE_TTL_MS = 60_000;
const NEW_TTL_MS = 5 * 60_000;

// ---------- command ----------

type View = "type" | "port" | "hubs" | `cat:${Category}`;

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [devices, setDevices] = useState<UsbDevice[]>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const { value: view = "type", setValue: setView } = useLocalStorage<View>("viewMode", "type");
  const [selectedId, setSelectedId] = useState<string>();
  const { value: showAbsent = false, setValue: setShowAbsent } = useLocalStorage<boolean>("showAbsentTypes", false);
  // Per-device icon choice among its own types, keyed by vendor:product:serial so it survives replugging.
  const { value: iconPrefs = {}, setValue: setIconPrefs } = useLocalStorage<Record<string, Category>>(
    "iconChoices",
    {},
  );
  useEffect(() => {
    LocalStorage.getItem<string>("pillTipShown3").then((v) => {
      if (v) return;
      showToast({ title: "Tip: click any pill to copy it — pills in Path and On This Hub jump to that device" });
      LocalStorage.setItem("pillTipShown3", "1");
    });
  }, []);
  const toggleAbsent = () => setShowAbsent(!showAbsent);
  const setIcon = (d: UsbDevice, c: Category) => setIconPrefs({ ...iconPrefs, [deviceId(d)]: c });
  const iconOf = (d: UsbDevice) => {
    const c = iconPrefs[deviceId(d)];
    return c && d.categories.includes(c) ? c : primaryCategory(d);
  };
  const [arrived, setArrived] = useState<Map<string, number>>(new Map());
  const [gone, setGone] = useState<Map<string, { d: UsbDevice; at: number }>>(new Map());
  const known = useRef<Map<string, UsbDevice> | null>(null);
  const inflight = useRef(false);
  const fingerprint = useRef<string>("");

  const load = useCallback(async (silent: boolean) => {
    if (inflight.current) return;
    inflight.current = true;
    if (!silent) setLoading(true);
    try {
      // Polls only pay for the full registry scan when the cheap fingerprint changed.
      const fp = await usbFingerprint().catch(() => "");
      if (silent && fp && fp === fingerprint.current) return;
      const list = await listUsbDevices();
      fingerprint.current = fp;
      const now = Date.now();
      const prev = known.current;
      if (prev) {
        const added = list.filter((d) => !prev.has(d.key));
        const removed = [...prev.values()].filter((d) => !list.some((x) => x.key === d.key));
        if (added.length || removed.length) {
          setArrived((m) => {
            const n = new Map(m);
            added.forEach((d) => n.set(d.key, now));
            return n;
          });
          setGone((m) => {
            const n = new Map(m);
            removed.forEach((d) => n.set(d.key, { d, at: now }));
            added.forEach((d) => n.delete(d.key));
            return n;
          });
          const msg = [
            added.length ? `Connected: ${added.map((d) => d.name).join(", ")}` : "",
            removed.length ? `Disconnected: ${removed.map((d) => d.name).join(", ")}` : "",
          ]
            .filter(Boolean)
            .join(" · ");
          showToast({ style: Toast.Style.Success, title: msg });
        }
      }
      known.current = new Map(list.map((d) => [d.key, d]));
      setDevices(list);
      setError(undefined);
    } catch (e) {
      setError(e as Error);
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    if (prefs.autoRefresh === false) return;
    const t = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(t);
  }, [load, prefs.autoRefresh]);

  // Expire "new" / "just disconnected" markers.
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setGone((m) =>
        [...m.values()].some((g) => now - g.at > GONE_TTL_MS)
          ? new Map([...m].filter(([, g]) => now - g.at <= GONE_TTL_MS))
          : m,
      );
      setArrived((m) =>
        [...m.values()].some((at) => now - at > NEW_TTL_MS)
          ? new Map([...m].filter(([, at]) => now - at <= NEW_TTL_MS))
          : m,
      );
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const all = devices ?? [];
  const pairing = useMemo(() => pairHubs(all), [devices]);

  // Order: by controller, then tree order (parents before children).
  const order = (d: UsbDevice) => `${d.controller}|${[...d.path, d.name].join("|")}`;
  const byOrder = (a: UsbDevice, b: UsbDevice) => order(a).localeCompare(order(b));
  const builtInOk = (d: UsbDevice) => prefs.showBuiltIn !== false || !d.builtIn;
  const isHubPart = (d: UsbDevice) => d.isHub || primaryCategory(d) === "Hub Controller";
  const endpoints = all.filter((d) => !isHubPart(d) && builtInOk(d));
  const hubs = all.filter((d) => d.isHub && builtInOk(d) && pairing.canon(d.key) === d.key);
  const hubInternals = all.filter((d) => !d.isHub && isHubPart(d) && builtInOk(d));
  // "Filter Type" lists only types present among the devices shown.
  const presentSet = new Set(endpoints.flatMap((d) => d.categories));
  // Alphabetical: the dropdown has no section headers, so group order would look random there.
  const allTypes = GROUPS.flatMap((g) => g.categories)
    .filter((c) => c !== "Hub")
    .sort();
  const presentCategories = allTypes.filter((c) => presentSet.has(c));
  const absentCategories = showAbsent ? allTypes.filter((c) => !presentSet.has(c)) : [];

  /** Select a device, switching to a view that contains it if needed. */
  const goTo = (key: string) => {
    const k = pairing.canon(key) ?? key;
    const d = all.find((x) => x.key === k);
    if (!d) return;
    const inHubs = d.isHub || primaryCategory(d) === "Hub Controller";
    if (inHubs && view !== "hubs") setView("hubs");
    else if (
      !inHubs &&
      (view === "hubs" || (view.startsWith("cat:") && !d.categories.includes(view.slice(4) as Category)))
    )
      setView("type");
    setSelectedId(k);
  };

  let sections: { key?: string; title: string; subtitle?: string; items: UsbDevice[] }[] = [];
  if (view === "type") {
    const external = endpoints.filter((d) => !d.builtIn);
    sections = GROUPS.map((g) => ({
      title: g.title,
      items: external.filter((d) => groupFor(primaryCategory(d)) === g.title),
    }));
    sections.push({ title: "Built-in", items: endpoints.filter((d) => d.builtIn) });
  } else if (view === "port") {
    // One section per hub the device is plugged into; both halves of a USB 3 hub count as one hub.
    const groups = new Map<string, UsbDevice[]>();
    for (const d of endpoints) {
      const k = pairing.canon(d.parentKey) ?? "";
      groups.set(k, [...(groups.get(k) ?? []), d]);
    }
    const byKey = new Map(all.map((d) => [d.key, d]));
    sections = [...groups.entries()]
      .map(([k, items]) => {
        const hub = k ? byKey.get(k) : undefined;
        const depth = hub ? hub.depth + 1 : 0;
        return {
          key: k || "root",
          title: hub ? `Via ${label(hub)}` : "Directly on Mac",
          subtitle: depth > 1 ? `${items.length} · ${depth} hubs deep` : String(items.length),
          items,
          depth,
        };
      })
      .sort((a, b) => a.depth - b.depth || a.title.localeCompare(b.title));
  } else if (view === "hubs") {
    sections = [
      { title: "Hubs & Docks", items: hubs.filter((d) => !d.builtIn) },
      { title: "Built-in Hubs", items: hubs.filter((d) => d.builtIn) },
      { title: "Hub Internals", subtitle: "controller chips inside hubs & docks", items: hubInternals },
    ];
  } else {
    const cat = view.slice(4) as Category;
    sections = [{ title: cat, items: endpoints.filter((d) => d.categories.includes(cat)) }];
  }
  sections = sections.map((s) => ({ ...s, items: [...s.items].sort(byOrder) }));
  const visibleCount = sections.reduce((n, s) => n + s.items.length, 0);

  const goneList = [...gone.values()].sort((a, b) => b.at - a.at);

  const item = (d: UsbDevice) => {
    const cat = iconOf(d);
    const st = cat ? CATEGORY_STYLE[cat] : undefined;
    const speed = speedFrom(d.speedCode, d.linkBps);
    const isNew = arrived.has(d.key);
    const accessories: List.Item.Accessory[] = [];
    if (isNew)
      accessories.push({ tag: { value: "New", color: Color.Green }, tooltip: `Connected ${ago(arrived.get(d.key)!)}` });
    if (linkDowngraded(d))
      accessories.push({
        icon: { source: Icon.Warning, tintColor: Color.Orange },
        tooltip: "Running below its max speed",
      });
    if (!showDetail) {
      const volumes = d.disks.flatMap((k) => k.volumes).filter((v) => v.mountPoint);
      if (volumes.length)
        accessories.push({ text: volumes.map((v) => v.name ?? v.bsd).join(", "), icon: Icon.HardDrive });
      if (d.serialPorts.length) accessories.push({ text: d.serialPorts[0].replace("/dev/", ""), icon: Icon.Terminal });
      const p = powerText(d);
      if (p) accessories.push({ text: p, icon: Icon.Bolt });
    }
    if (!showDetail && d.networkLink)
      accessories.push(
        d.networkLink.active
          ? { icon: { source: Icon.Link, tintColor: Color.Green }, tooltip: "Ethernet cable connected" }
          : { icon: { source: Icon.Minus, tintColor: Color.SecondaryText }, tooltip: "No Ethernet cable" },
      );
    if (speed) accessories.push({ tag: { value: speed.rate, color: speed.color } });

    const keywords = [
      d.name,
      d.vendor,
      hex4(d.vendorId),
      hex4(d.productId),
      d.serial,
      ...d.categories,
      ...d.drivers,
      ...d.serialPorts,
      ...d.networkInterfaces,
      ...d.disks.flatMap((k) => [k.bsd, ...k.volumes.map((v) => v.name ?? "")]),
    ].filter((x): x is string => !!x);

    const mounted = d.disks.flatMap((k) => k.volumes).filter((v) => v.mountPoint);
    const ejectable = d.disks.filter((k) => k.ejectable || k.removable || !d.builtIn);

    return (
      <List.Item
        key={d.key}
        id={d.key}
        title={label(d)}
        subtitle={showDetail ? undefined : d.vendor}
        keywords={keywords}
        icon={{ source: st?.icon ?? Icon.Plug, tintColor: st?.color ?? Color.SecondaryText }}
        accessories={accessories}
        detail={<DeviceDetail d={d} all={all} pairing={pairing} onSelect={goTo} iconOf={iconOf} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Show in System Information" icon={Icon.Info} onAction={() => showInSystemInformation(d)} />
              <Action
                title={showDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                onAction={() => setShowDetail((v) => !v)}
              />
              {(() => {
                const kids = childrenOf(d, all, pairing);
                const parent = d.parentKey ? all.find((x) => x.key === pairing.canon(d.parentKey)) : undefined;
                return (
                  <>
                    {kids.length > 0 && (
                      <ActionPanel.Submenu
                        title={d.isHub ? "Go to Device on This Hub…" : "Go to Device Behind This…"}
                        icon={Icon.ArrowDown}
                        shortcut={{ modifiers: ["cmd"], key: "]" }}
                      >
                        {kids.map((c) => (
                          <Action
                            key={c.key}
                            title={label(c)}
                            icon={CATEGORY_STYLE[iconOf(c) ?? "Vendor"].icon}
                            onAction={() => goTo(c.key)}
                          />
                        ))}
                      </ActionPanel.Submenu>
                    )}
                    {parent && (
                      <Action
                        title={`Go to Parent: ${label(parent)}`}
                        icon={Icon.ArrowUp}
                        shortcut={{ modifiers: ["cmd"], key: "[" }}
                        onAction={() => goTo(parent.key)}
                      />
                    )}
                  </>
                );
              })()}
              {d.categories.length > 1 && (
                <ActionPanel.Submenu title="Set Icon…" icon={Icon.Brush} shortcut={{ modifiers: ["cmd"], key: "i" }}>
                  {d.categories.map((c) => (
                    <Action
                      key={c}
                      title={c}
                      icon={{ source: CATEGORY_STYLE[c].icon, tintColor: CATEGORY_STYLE[c].color }}
                      onAction={() => setIcon(d, c)}
                    />
                  ))}
                </ActionPanel.Submenu>
              )}
            </ActionPanel.Section>
            {(mounted.length > 0 || ejectable.length > 0) && (
              <ActionPanel.Section title="Storage">
                {mounted.map((v, i) => (
                  <Action.ShowInFinder
                    key={v.bsd}
                    title={`Show "${v.name ?? v.bsd}" in Finder`}
                    path={v.mountPoint!}
                    shortcut={i === 0 ? { modifiers: ["cmd", "shift"], key: "f" } : undefined}
                  />
                ))}
                {ejectable.map((k, i) => (
                  <Action
                    key={k.bsd}
                    title={`Eject ${k.bsd}`}
                    icon={Icon.Eject}
                    style={Action.Style.Destructive}
                    shortcut={i === 0 ? { modifiers: ["cmd"], key: "e" } : undefined}
                    onAction={async () => {
                      const ok = await confirmAlert({
                        title: `Eject ${d.name}?`,
                        message: `Unmounts every volume on ${k.bsd}.`,
                        primaryAction: { title: "Eject", style: Alert.ActionStyle.Destructive },
                      });
                      if (!ok) return;
                      const toast = await showToast({ style: Toast.Style.Animated, title: `Ejecting ${k.bsd}…` });
                      try {
                        await ejectDisk(k.bsd);
                        toast.style = Toast.Style.Success;
                        toast.title = `Ejected ${d.name}`;
                        load(true);
                      } catch (e) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Couldn't eject";
                        toast.message = (e as Error).message;
                      }
                    }}
                  />
                ))}
              </ActionPanel.Section>
            )}
            {d.serialPorts.length > 0 && (
              <ActionPanel.Section title="Serial">
                {d.serialPorts.map((p) => (
                  <Action.CopyToClipboard key={p} title={`Copy ${p}`} content={p} icon={Icon.Terminal} />
                ))}
                <Action.CopyToClipboard
                  title="Copy Screen Command (115200)"
                  content={`screen ${d.serialPorts[0]} 115200`}
                  icon={Icon.Terminal}
                />
              </ActionPanel.Section>
            )}
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard
                title="Copy Summary"
                content={summary(d)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard title="Copy Name" content={d.name} shortcut={Keyboard.Shortcut.Common.CopyName} />
              <Action.CopyToClipboard
                title="Copy Vendor:Product ID"
                content={vidpid(d)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              />
              <Action.CopyToClipboard
                title="Copy as JSON"
                content={json(d)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => load(false)}
              />
              <Action
                title={showAbsent ? "Hide Not Connected Types" : "List Not Connected Types"}
                icon={Icon.EyeDisabled}
                onAction={toggleAbsent}
              />
              <Action.Push
                title="Show Raw Properties"
                icon={Icon.Code}
                target={<RawProperties d={d} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={loading}
      selectedItemId={selectedId}
      onSelectionChange={(id) => id && setSelectedId(id)}
      isShowingDetail={showDetail && visibleCount > 0}
      searchBarPlaceholder="Filter by name, vendor, ID, serial, type, volume…"
      searchBarAccessory={
        <List.Dropdown tooltip="View" value={view} onChange={(v) => setView(v as View)}>
          <List.Dropdown.Section title="View">
            <List.Dropdown.Item title="By Type" value="type" icon={Icon.AppWindowGrid2x2} />
            <List.Dropdown.Item title="By Hub / Port" value="port" icon={Icon.Plug} />
            <List.Dropdown.Item title="By Hubs & Internals" value="hubs" icon={Icon.ComputerChip} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Filter Type">
            {presentCategories.map((c) => (
              <List.Dropdown.Item
                key={c}
                title={c}
                value={`cat:${c}`}
                icon={{ source: CATEGORY_STYLE[c].icon, tintColor: CATEGORY_STYLE[c].color }}
              />
            ))}
          </List.Dropdown.Section>
          {absentCategories.length > 0 && (
            <List.Dropdown.Section title="Not Connected">
              {absentCategories.map((c) => (
                <List.Dropdown.Item
                  key={c}
                  title={c}
                  value={`cat:${c}`}
                  icon={{ source: CATEGORY_STYLE[c].icon, tintColor: CATEGORY_STYLE[c].color }}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't read the USB registry"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => load(false)} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.Plug} title="No USB devices" description="Nothing matches this filter." />
      )}
      {sections.map((s) =>
        s.items.length ? (
          <List.Section key={s.key ?? s.title} title={s.title} subtitle={s.subtitle ?? String(s.items.length)}>
            {s.items.map(item)}
          </List.Section>
        ) : null,
      )}
      {(view === "type" || view === "port") && goneList.length > 0 && (
        <List.Section title="Just Disconnected">
          {goneList.map(({ d, at }) => (
            <List.Item
              key={`gone-${d.key}`}
              title={d.name}
              subtitle={showDetail ? undefined : d.vendor}
              icon={{ source: Icon.Plug, tintColor: Color.SecondaryText }}
              accessories={[{ tag: { value: ago(at), color: Color.Red }, tooltip: "Disconnected" }]}
              detail={<DeviceDetail d={d} all={all} pairing={pairing} onSelect={goTo} iconOf={iconOf} />}
              actions={
                <ActionPanel>
                  <Action
                    title={showDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    onAction={() => setShowDetail((v) => !v)}
                  />
                  <Action.CopyToClipboard title="Copy Summary" content={summary(d)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
