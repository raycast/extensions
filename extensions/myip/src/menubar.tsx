import { MenuBarExtra, Icon, Clipboard, showHUD } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { networkInterfaces } from "os";

const PUBLIC_IPS_MAX_AGE_MS = 15 * 60 * 1000;

type Ips = { ipv4?: string; ipv6?: string };
type Adapter = Ips & { name: string; internal: boolean };
type OptionName = "Public IPv4" | "Public IPv6" | "Local IPv4" | "Local IPv6";
type MenubarOption = { name: OptionName; ip?: string };
type PublicIpsCache = { ips: Ips; fingerprint: string; fetchedAt: number };

function readAdapters(): Adapter[] {
  const adapters: Adapter[] = [];
  for (const [name, ifaces] of Object.entries(networkInterfaces())) {
    if (!ifaces) continue;
    const adapter: Adapter = { name, internal: ifaces.some((i) => i.internal) };
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !adapter.ipv4) adapter.ipv4 = iface.address;
      if (iface.family === "IPv6" && !adapter.ipv6) adapter.ipv6 = iface.address;
    }
    if (adapter.ipv4 || adapter.ipv6) adapters.push(adapter);
  }
  return adapters;
}

async function fetchPublicIps(): Promise<Ips> {
  const fetchIp = async (url: string): Promise<string | undefined> => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return undefined;
      return (await res.text()).trim() || undefined;
    } catch {
      return undefined;
    }
  };
  const [ipv4, ipv6] = await Promise.all([fetchIp("https://api.ipify.org"), fetchIp("https://api6.ipify.org")]);
  return { ipv4, ipv6 };
}

async function copyIp(label: string, ip: string | undefined) {
  if (!ip) return showHUD("Not available");
  await Clipboard.copy(ip);
  await showHUD(`Copied ${label}: ${ip}`);
}

function withAdapter(name: string, adapterName: string | undefined) {
  return name.startsWith("Local") && adapterName ? `${name} · ${adapterName}` : name;
}

function selectable<T extends { name: string }>(
  items: T[],
  selected: string | undefined,
  onSelect: (name: T["name"]) => void,
) {
  return items.map((item) => (
    <MenuBarExtra.Item
      key={item.name}
      title={item.name}
      icon={selected === item.name ? Icon.CheckCircle : Icon.Circle}
      onAction={() => onSelect(item.name)}
    />
  ));
}

function addressItem(option: MenubarOption, adapterName: string | undefined) {
  const isLocal = option.name.startsWith("Local");
  const label = withAdapter(option.name, adapterName);
  return (
    <MenuBarExtra.Item
      key={option.name}
      title={label}
      subtitle={option.ip ?? "—"}
      icon={isLocal ? Icon.Network : Icon.Globe}
      onAction={() => copyIp(label, option.ip)}
    />
  );
}

export default function Command() {
  const [selectedMenubarOption, setMenubarOption] = useCachedState<OptionName | null>("menubarOption", null);
  const [selectedLocalAdapter, setLocalAdapter] = useCachedState<string | null>("localAdapter", null);
  const [cache, setCache] = useCachedState<PublicIpsCache | null>("publicIpsCache", null);

  const allAdapters = readAdapters();
  const loopback = allAdapters.find((a: Adapter) => a.internal);
  const external = allAdapters.filter((a: Adapter) => !a.internal);
  const connected = external.filter((a: Adapter) => a.ipv4);
  const disconnected = external.filter((a: Adapter) => !a.ipv4);
  const pickerAdapters = connected.length > 0 ? connected : loopback ? [loopback] : [];
  const activeAdapter = pickerAdapters.find((a: Adapter) => a.name === selectedLocalAdapter) ?? pickerAdapters[0];

  const fingerprint = connected.map((a: Adapter) => `${a.name}|${a.ipv4 ?? ""}|${a.ipv6 ?? ""}`).join(",");
  const isStale = !cache || Date.now() - cache.fetchedAt > PUBLIC_IPS_MAX_AGE_MS;
  const shouldFetch = cache?.fingerprint !== fingerprint || isStale;

  const { isLoading, revalidate } = usePromise(fetchPublicIps, [], {
    execute: shouldFetch,
    onData: (ips) => {
      if (ips.ipv4 || ips.ipv6) setCache({ ips, fingerprint, fetchedAt: Date.now() });
    },
  });

  const publicIps = cache?.ips ?? {};
  const menubarOptions: MenubarOption[] = [
    { name: "Public IPv4", ip: publicIps.ipv4 },
    { name: "Public IPv6", ip: publicIps.ipv6 },
    { name: "Local IPv4", ip: activeAdapter?.ipv4 },
    { name: "Local IPv6", ip: activeAdapter?.ipv6 },
  ];
  const activeMenubarOption = menubarOptions.find((o) => o.name === selectedMenubarOption) ?? menubarOptions[0];

  const menuTitle = activeMenubarOption.ip ?? (isLoading ? "Loading…" : "—");
  const menuTooltip = withAdapter(activeMenubarOption.name, activeAdapter?.name);
  const adapterSubmenuTitle = activeAdapter?.name
    ? `Local Network Adapter · ${activeAdapter.name}`
    : "Local Network Adapter";

  return (
    <MenuBarExtra title={menuTitle} tooltip={menuTooltip} isLoading={isLoading}>
      <MenuBarExtra.Section title="Addresses · click to copy">
        {menubarOptions.map((option) => addressItem(option, activeAdapter?.name))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title={adapterSubmenuTitle} icon={Icon.Plug}>
          {pickerAdapters.length > 0 ? (
            selectable(pickerAdapters, activeAdapter?.name, setLocalAdapter)
          ) : (
            <MenuBarExtra.Item title="No adapters found" />
          )}
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Item title="Refresh Public IP" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
      </MenuBarExtra.Section>

      {disconnected.length > 0 && (
        <MenuBarExtra.Section title="Other Adapters">
          {disconnected.map((adapter: Adapter) => (
            <MenuBarExtra.Item
              key={adapter.name}
              title={adapter.name}
              subtitle={adapter.ipv6 ?? "—"}
              icon={Icon.Livestream}
              onAction={() => copyIp(`${adapter.name} IPv6`, adapter.ipv6)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title={`Show in menu bar · ${activeMenubarOption.name}`} icon={Icon.Cog}>
          {selectable(menubarOptions, activeMenubarOption.name, setMenubarOption)}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
