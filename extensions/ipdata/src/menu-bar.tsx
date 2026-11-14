import {
  Clipboard,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { cachedMyIp } from "./lib/cache";
import { flagIcon } from "./lib/flags";
import { maskIp } from "./lib/ip";
import { IpRecord, LookupOk } from "./lib/ipdata";
import * as P from "./lib/present";
import { getSettings, settingsKey } from "./lib/settings";

// Country flag and public IP in the menu bar; the full addresses and record in the menu. Raycast runs
// the command every 10 minutes in the background (see "interval" in package.json).
export default function Command() {
  const settings = getSettings();
  const [nonce, setNonce] = useState(0);
  const { data, isLoading } = useCachedPromise(
    (tag: string, key: string, force: number) => {
      void tag;
      void key;
      return cachedMyIp(settings, force > 0);
    },
    ["myip", settingsKey(settings), nonce],
    { keepPreviousData: true },
  );
  const v4 = data?.ok ? data.v4 : null;
  const v6 = data?.ok ? data.v6 : null;
  // With an API key, a failed keyed lookup is reported rather than hidden behind the free record.
  const keyError = data?.ok ? (data.v4KeyError ?? data.v6KeyError) : undefined;
  const primary = v4 ?? v6;
  const m = primary?.model ?? null;

  const title = menuBarTitle(m, isLoading);
  const tooltip = m ? `${P.placeOf(m).short} · ${P.operatorLine(m)}` : "ipdata · your public IP";

  return (
    <MenuBarExtra icon={flagIcon(m)} title={title} tooltip={tooltip} isLoading={isLoading}>
      <MenuBarExtra.Section title="Your connection">
        <AddressItem label="IPv4" record={v4} />
        <AddressItem label="IPv6" record={v6} />
      </MenuBarExtra.Section>
      {keyError ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="API key lookup failed"
            subtitle={keyError.message}
            icon={Icon.Warning}
            onAction={() => openExtensionPreferences()}
          />
        </MenuBarExtra.Section>
      ) : null}
      {m ? <RecordItems m={m} /> : null}
      <MenuBarExtra.Section>
        {m ? (
          <MenuBarExtra.Item
            title="Look Up in Raycast"
            icon={Icon.MagnifyingGlass}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "lookup-ip",
                  type: LaunchType.UserInitiated,
                  arguments: { address: m.ip },
                });
              } catch (error) {
                await showFailureToast(error, { title: "Could not open Look Up IP" });
              }
            }}
          />
        ) : null}
        {m ? (
          <MenuBarExtra.Item title="Open on ipdata.co" icon={Icon.Globe} onAction={() => open(P.ipdataUrl(m.ip))} />
        ) : null}
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => setNonce((n) => n + 1)}
        />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

// The text next to the flag, from the Menu Bar Label preference. By default the last part of the address
// is hidden, so the full address isn't on screen when the menu bar is shared or recorded.
function menuBarTitle(m: IpRecord | null, isLoading: boolean): string | undefined {
  const { menuBarLabel } = getPreferenceValues<Preferences.MenuBar>();
  if (!m) return isLoading ? (menuBarLabel === "flag" ? undefined : "…") : "No connection";
  switch (menuBarLabel) {
    case "full":
      return m.ip;
    case "label":
      return "My IP";
    case "flag":
      return undefined;
    default:
      return maskIp(m.ip);
  }
}

async function copy(value: string, what: string) {
  await Clipboard.copy(value);
  await showHUD(`Copied ${what}`);
}

function AddressItem({ label, record }: { label: "IPv4" | "IPv6"; record: LookupOk | null }) {
  if (!record) return <MenuBarExtra.Item title={`No ${label} connectivity`} icon={Icon.XMarkCircle} />;
  const ip = record.model.ip;
  return (
    <MenuBarExtra.Item
      title={ip}
      subtitle={label}
      icon={Icon.CopyClipboard}
      tooltip={`Copy ${label} address`}
      onAction={() => copy(ip, `${label} address`)}
    />
  );
}

function RecordItems({ m }: { m: IpRecord }) {
  const place = P.placeOf(m);
  const op = P.operatorOf(m);
  const owner = P.ownerOf(m);
  const coords = P.coordsText(m);
  const apple = P.appleMapsUrl(m);
  const t = m.threat;
  const trust = t?.scores?.trust_score;
  const flags = P.activeFlags(t);
  const localTime = P.localTimeText(m);
  const opText = [op.asn, op.name].filter(Boolean).join(" ") || null;
  return (
    <MenuBarExtra.Section title="Location">
      <MenuBarExtra.Item
        title={[place.headline, place.line].filter(Boolean).join(" · ")}
        icon={flagIcon(m)}
        tooltip="Copy location"
        onAction={() => copy(place.short, "location")}
      />
      {opText ? (
        <MenuBarExtra.Item
          title={opText}
          subtitle={op.type || "Operator"}
          icon={Icon.Network}
          tooltip="Copy operator"
          onAction={() => copy(opText, "operator")}
        />
      ) : null}
      {owner.name && (owner.fromCompany || owner.name !== op.name) ? (
        <MenuBarExtra.Item
          title={owner.name}
          subtitle={[owner.domain, owner.network].filter(Boolean).join(" · ") || "Owner"}
          icon={Icon.Building}
          tooltip="Copy owner"
          onAction={() => copy(owner.name ?? "", "owner")}
        />
      ) : null}
      {coords ? (
        <MenuBarExtra.Item
          title={coords}
          subtitle="Open in Maps"
          icon={Icon.Map}
          onAction={() => (apple ? open(apple) : copy(coords, "coordinates"))}
        />
      ) : null}
      {localTime ? (
        <MenuBarExtra.Item title={localTime} icon={Icon.Clock} onAction={() => copy(localTime, "local time")} />
      ) : null}
      {t ? (
        <MenuBarExtra.Item
          title={
            typeof trust === "number"
              ? `Trust score ${trust} · ${P.riskLabel(trust)}`
              : flags.length
                ? flags.map((f) => f.label).join(", ")
                : P.verdict(t)
          }
          subtitle={typeof trust === "number" && flags.length ? flags.map((f) => f.label).join(", ") : undefined}
          icon={Icon.Shield}
          onAction={() => open(P.ipdataUrl(m.ip))}
        />
      ) : null}
    </MenuBarExtra.Section>
  );
}
