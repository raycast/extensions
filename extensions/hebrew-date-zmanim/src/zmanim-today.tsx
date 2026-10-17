import { Action, ActionPanel, List, Toast, showToast, LocalStorage, Form, Icon, useNavigation } from "@raycast/api";
import { useMemo, useState, useEffect, useCallback } from "react";
import Fuse from "fuse.js";
import { getZmanimJson } from "kosher-zmanim";
import { JewishDate } from "kosher-zmanim";

function DatePickerForm({ onDateSelect }: { onDateSelect: (date: Date) => void }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { pop } = useNavigation();

  function handleSubmit() {
    onDateSelect(selectedDate);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Select Date" onSubmit={handleSubmit} icon={Icon.Calendar} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="date"
        title="Select Date"
        value={selectedDate}
        onChange={(date) => date && setSelectedDate(date)}
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}

export default function ZmanimTodayCommand() {
  const [allPairs, setAllPairs] = useState<{ key: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationName, setLocationName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { push } = useNavigation();

  const fuse = useMemo(
    () => new Fuse(allPairs, { includeScore: true, threshold: 0.4, keys: ["key", "value"] }),
    [allPairs],
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return allPairs;
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, allPairs]);

  const loadZmanim = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await LocalStorage.getItem<string>("zmanim:lastLocation");
      if (!stored) throw new Error("No saved location. Open the 'Setup Location' command and select an address first.");

      const { locationName, lat, lon, tz } = JSON.parse(stored) as {
        locationName: string;
        lat: number;
        lon: number;
        tz: string;
      };
      setLocationName(locationName);

      const opts = {
        date: selectedDate,
        locationName,
        latitude: lat,
        longitude: lon,
        timeZoneId: tz,
        elevation: 0,
        // Note: complexZmanim is enabled by default for comprehensive calculations
        complexZmanim: true,
      } as {
        date: Date;
        locationName: string;
        latitude: number;
        longitude: number;
        timeZoneId: string;
        elevation: number;
        complexZmanim: boolean;
      };

      const data = await getZmanimJson(opts);
      const selectedJd = new JewishDate();
      selectedJd.setGregorianDate(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const hebrewDate = selectedJd.toString();

      const entries: { key: string; value: string }[] = [{ key: "Hebrew Date", value: hebrewDate }];

      if (data?.metadata) {
        for (const [k, v] of Object.entries(data.metadata)) {
          entries.push({ key: `meta:${k}`, value: String(v) });
        }
      }

      if (data?.Zmanim) {
        for (const [k, v] of Object.entries(data.Zmanim)) {
          entries.push({ key: k, value: String(v) });
        }
      }

      setAllPairs(entries);
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load zmanim",
        message: String(e instanceof Error ? e.message : e),
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadZmanim();
  }, [selectedDate, loadZmanim]);

  function formatTimeOnly(s: string) {
    if (!s || s === "N/A") return s;
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(d);
  }

  const jsonPretty = useMemo(
    () => JSON.stringify(Object.fromEntries(filtered.map((p) => [p.key, p.value])), null, 2),
    [filtered],
  );

  const dateStr = selectedDate.toLocaleDateString();
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search zmanim… (e.g., alos, netz, shkia, tzais)"
      onSearchTextChange={setQuery}
      searchText={query}
      throttle
    >
      <List.Section title={`${isToday ? "Today's" : dateStr} Zmanim${locationName ? ` - ${locationName}` : ""}`}>
        {filtered
          .filter((p) => !p.key.startsWith("meta:"))
          .map((p) => (
            <List.Item
              key={p.key}
              title={p.key}
              subtitle={formatTimeOnly(p.value)}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Time" content={formatTimeOnly(p.value)} />
                  <Action.CopyToClipboard title="Copy Name + Time" content={`${p.key}: ${formatTimeOnly(p.value)}`} />
                  <Action.CopyToClipboard title="Copy Name" content={p.key} />
                  <Action.CopyToClipboard title="Copy Full Datetime" content={p.value} />
                  <Action
                    title="Change Date"
                    icon={Icon.Calendar}
                    onAction={() => push(<DatePickerForm onDateSelect={setSelectedDate} />)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      <List.Section title="Metadata">
        {filtered
          .filter((p) => p.key.startsWith("meta:"))
          .map((p) => (
            <List.Item
              key={p.key}
              title={p.key.replace(/^meta:/, "")}
              subtitle={p.value}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy" content={`${p.key}: ${p.value}`} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Copy All as JSON"
          subtitle="Copy all filtered results as JSON"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy JSON" content={jsonPretty} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
