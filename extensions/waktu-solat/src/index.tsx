import { Action, ActionPanel, Color, List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { loadCached } from "./lib/loaders";
import { loadStoredPrayerTime, loadTodaySolat, PrayerTime, PrayerTimeItem } from "./lib/prayer-times";
import { extractZones, Zone } from "./lib/zones";

function Zones(props: { value?: string; onChange: (z: Zone) => void }) {
  const { data: zones, isLoading } = usePromise(() =>
    loadCached({ key: "zones-v2", load: extractZones, isValid: (zones) => zones.length > 0 }),
  );

  // On mount Raycast emits the first item before the default value; ignore events until the default is confirmed.
  const settled = useRef(false);

  if (!zones || !props.value) return <></>;

  return (
    <List.Dropdown
      isLoading={isLoading}
      tooltip="Select Zone"
      defaultValue={props.value}
      onChange={(newId) => {
        if (!settled.current) {
          settled.current = newId === props.value;
          return;
        }
        props.onChange(zones?.find((z) => z.id == newId) || { id: newId, name: "", state: "" });
      }}
    >
      <List.Dropdown.Section>
        {zones?.map((z) => (
          <List.Dropdown.Item key={z.id} title={`${z.id} - ${z.name}`} value={z.id} keywords={[z.state, z.id]} />
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
    return isNext ? { tag: { value: different } } : undefined;
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
  const [dropdownKey, setDropdownKey] = useState(0);
  const requestId = useRef(0);

  const zoneId = selectedZoneId ?? initialData?.zoneId;
  const currentPrayerTime = prayerTime ?? initialData?.prayerTime;

  async function onZoneChange(z: Zone) {
    if (!zoneId || !z.id || z.id === zoneId) return;
    const currentRequestId = ++requestId.current;
    setIsChangingZone(true);

    try {
      const result = await loadTodaySolat(z.id);
      if (currentRequestId !== requestId.current) return;

      if (!result) {
        // Remount the dropdown so it shows the zone whose times are still on screen.
        setDropdownKey((key) => key + 1);
        return;
      }

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
    <List
      searchBarAccessory={zoneId ? <Zones key={dropdownKey} value={zoneId} onChange={onZoneChange} /> : undefined}
      isLoading={isInitialLoading || isChangingZone}
    >
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
