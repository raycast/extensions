import { Action, ActionPanel, Color, List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { loadCached } from "./lib/loaders";
import { loadStoredPrayerTime, loadTodaySolat, PrayerTime, PrayerTimeItem } from "./lib/prayer-times";
import { extractZones, Zone } from "./lib/zones";

function Zones(props: { onChange: (z: Zone) => void }) {
  const { data: zones, isLoading } = usePromise(() =>
    loadCached({ key: "zones", load: extractZones, isValid: (zones) => zones.length > 0 }),
  );

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
  const requestId = useRef(0);

  const zoneId = selectedZoneId ?? initialData?.zoneId;
  const currentPrayerTime = prayerTime ?? initialData?.prayerTime;

  async function onZoneChange(z: Zone) {
    const currentRequestId = ++requestId.current;
    setIsChangingZone(true);

    try {
      const result = await loadTodaySolat(z.id);
      if (!result || currentRequestId !== requestId.current) return;

      await LocalStorage.setItem("zone", z.id);
      if (currentRequestId !== requestId.current) return;

      setSelectedZoneId(z.id);
      setPrayerTime(result);
    } finally {
      if (currentRequestId === requestId.current) {
        setIsChangingZone(false);
      }
    }
  }

  async function refreshPrayerTime() {
    if (!zoneId) return;
    const currentRequestId = ++requestId.current;
    setIsChangingZone(true);

    try {
      const result = await loadTodaySolat(zoneId, true);
      if (result && currentRequestId === requestId.current) {
        setPrayerTime(result);
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setIsChangingZone(false);
      }
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
