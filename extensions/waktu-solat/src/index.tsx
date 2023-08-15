import { loadZones, Zone } from "./lib/zones";
import React, { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { loadTodaySolat, PrayerTime, PrayerTimeItem } from "./lib/prayer-times";
import { Action, ActionPanel, Color, List } from "@raycast/api";
import Accessory = List.Item.Accessory;

function Zones(props: { onChange: (z: Zone) => void }) {
  const [isLoading, setLoading] = useState(true);
  const [zones, setZones] = useCachedState<Zone[]>("zones");

  useEffect(() => {
    async function load() {
      setZones(await loadZones());
      setLoading(false);
    }

    // noinspection JSIgnoredPromiseFromCall
    load();
  });
  return (
    <List.Dropdown
      isLoading={isLoading}
      tooltip="Select Zone"
      storeValue={true}
      onChange={(newId) => {
        props.onChange(zones?.find((z) => z.id == newId) || { id: newId, name: "", state: "" });
      }}
    >
      <List.Dropdown.Section title="Zones">
        {zones?.map((z) => (
          <List.Dropdown.Item key={z.id} title={z.name} value={z.id} keywords={[z.state, z.id]} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function PrayerItem(props: { item: PrayerTimeItem; items: PrayerTimeItem[] }) {
  const {
    item: { isCurrent, label, value, different, isNext },
  } = props;
  const [tag, setTag] = useState<Accessory>();

  function setupTag(): Accessory | undefined {
    return isCurrent
      ? {
          tag: { value: "Current", color: Color.Green },
        }
      : isNext
      ? { tag: { value: different } }
      : undefined;
  }

  useEffect(() => {
    setTag(setupTag);
  }, []);

  return (
    <List.Item
      icon="🕌"
      key={label}
      title={label}
      subtitle={value}
      accessories={tag ? [tag] : []}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={() => setTag(setupTag())} />
        </ActionPanel>
      }
    />
  );
}

function prayerTimes() {
  const [isLoading, setLoading] = useState(true);
  const [prayerTime, setPrayerTime] = useState<PrayerTime>();

  async function onZoneChange(z: Zone) {
    setLoading(true);
    // console.log('change to', z)
    setPrayerTime(await loadTodaySolat(z.id));
    setLoading(false);
  }

  return (
    <List searchBarAccessory={<Zones onChange={onZoneChange} />} isLoading={isLoading}>
      <List.Section title={prayerTime?.date}>
        {prayerTime?.items?.map((p) => (
          <PrayerItem item={p} key={p.label} items={prayerTime.items!} />
        ))}
      </List.Section>
    </List>
  );
}

// noinspection JSUnusedGlobalSymbols
export default function Command() {
  return prayerTimes();
}
