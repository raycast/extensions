import { Action, ActionPanel, Color, List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { loadCached } from "./lib/loaders";
import { loadStoredPrayerTime, loadTodaySolat, PrayerTime, PrayerTimeItem } from "./lib/prayer-times";
import { extractZones, Zone } from "./lib/zones";

function Zones(props: { onChange: (z: Zone) => void }) {
  const { data: zones, isLoading } = usePromise(() => loadCached("zones", extractZones));

  return (
    <List.Dropdown
      isLoading={isLoading}
      tooltip="Select Zone"
      storeValue={true}
      onChange={(newId) => {
        props.onChange(zones?.find((z) => z.id == newId) || { id: newId, name: "", state: "" });
      }}
    >
      <List.Dropdown.Section>
        {zones?.map((z) => (
          <List.Dropdown.Item key={z.id} title={z.name} value={z.id} keywords={[z.state, z.id]} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function PrayerItem(props: { item: PrayerTimeItem; onRefresh: () => Promise<void> }) {
  const {
    item: { isCurrent, label, value, different, isNext },
  } = props;

  function getTag(): List.Item.Accessory | undefined {
    if (isCurrent) {
      return { tag: { value: "Current", color: Color.Green } };
    }
    if (isNext) {
      return { tag: { value: different } };
    }
    return undefined;
  }

  const tag = getTag();

  return (
    <List.Item
      icon="🕌"
      key={label}
      title={label}
      subtitle={value}
      accessories={tag ? [tag] : []}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function PrayerTimes() {
  const { data: initialData, isLoading: isInitialLoading } = usePromise(loadStoredPrayerTime);
  const [selectedZoneId, setSelectedZoneId] = useState<string>();
  const [prayerTime, setPrayerTime] = useState<PrayerTime>();
  const [isChangingZone, setIsChangingZone] = useState(false);

  const zoneId = selectedZoneId ?? initialData?.zoneId;
  const currentPrayerTime = selectedZoneId ? prayerTime : initialData?.prayerTime;

  async function onZoneChange(z: Zone) {
    setSelectedZoneId(z.id);
    setIsChangingZone(true);

    try {
      await LocalStorage.setItem("zone", z.id);
      setPrayerTime(await loadTodaySolat(z.id));
    } finally {
      setIsChangingZone(false);
    }
  }

  async function refreshPrayerTime() {
    if (!zoneId) return;
    setSelectedZoneId(zoneId);
    setIsChangingZone(true);

    try {
      setPrayerTime(await loadTodaySolat(zoneId, true));
    } finally {
      setIsChangingZone(false);
    }
  }

  return (
    <List searchBarAccessory={<Zones onChange={onZoneChange} />} isLoading={isInitialLoading || isChangingZone}>
      {currentPrayerTime?.items?.length ? (
        <List.Section title={currentPrayerTime.date}>
          {currentPrayerTime.items.map((p) => (
            <PrayerItem item={p} key={p.label} onRefresh={refreshPrayerTime} />
          ))}
        </List.Section>
      ) : (
        !isInitialLoading && (
          <List.EmptyView
            title="No prayer times available"
            description="Try selecting a different zone or refreshing."
          />
        )
      )}
    </List>
  );
}

export default function Command() {
  return <PrayerTimes />;
}
