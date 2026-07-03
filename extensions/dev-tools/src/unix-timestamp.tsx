import { Action, ActionPanel, Clipboard, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { type Format, type Unit, UNITS, UNIT_ABBR, UNIT_LABEL, formats, parseInput, toUnits } from "./lib/unix-time";

type Override = Unit | "auto";

const FORMAT_ICON: Record<string, Icon> = {
  Local: Icon.Calendar,
  UTC: Icon.Globe,
  "ISO 8601": Icon.Code,
  "RFC 2822": Icon.Envelope,
  Relative: Icon.Clock,
};

export default function Command() {
  const { timeFormat } = getPreferenceValues<Preferences.UnixTimestamp>();
  const hour12 = timeFormat === "12";

  const [searchText, setSearchText] = useState("");
  const [override, setOverride] = useState<Override>("auto");
  const [now, setNow] = useState(() => new Date());

  // Keep the current epoch (and relative times) live, ticking once a second.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Prefill from the clipboard on open, but only if it parses.
  useEffect(() => {
    (async () => {
      const clip = (await Clipboard.readText())?.trim();
      if (!clip) return;
      try {
        parseInput(clip, "auto");
        setSearchText(clip);
      } catch {
        // Clipboard isn't a timestamp or date — leave the field empty.
      }
    })();
  }, []);

  const result = useMemo(() => {
    if (!searchText.trim()) return null;
    try {
      const parsed = parseInput(searchText, override);
      return {
        parsed,
        units: toUnits(parsed.epochNanos),
        formats: formats(parsed.date, new Date(), hour12),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [searchText, override, hour12]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a Unix timestamp or a date — e.g. 1782385809 or 2026-06-25T11:09:55Z"
      searchBarAccessory={
        <List.Dropdown tooltip="Interpret the number as" value={override} onChange={(v) => setOverride(v as Override)}>
          <List.Dropdown.Item title="Auto-detect unit" value="auto" />
          <List.Dropdown.Section title="Force unit">
            {UNITS.map((u) => (
              <List.Dropdown.Item key={u} title={UNIT_LABEL[u]} value={u} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!result ? (
        <CurrentTime now={now} onUse={setSearchText} hour12={hour12} />
      ) : "error" in result ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={result.error}
          description="Numbers are read as timestamps; text is parsed as a date. Try 1782385809 or 2026-06-25."
        />
      ) : (
        <Result result={result} />
      )}
    </List>
  );
}

function CurrentTime({ now, onUse, hour12 }: { now: Date; onUse: (text: string) => void; hour12: boolean }) {
  const seconds = Math.floor(now.getTime() / 1000).toString();
  const millis = now.getTime().toString();
  return (
    <>
      <List.Section title="Current Unix Time">
        <CopyRow
          icon={Icon.Stopwatch}
          title="Seconds"
          value={seconds}
          accessory="now"
          extra={<Action title="Use as Input" icon={Icon.ArrowRight} onAction={() => onUse(seconds)} />}
        />
        <CopyRow
          icon={Icon.Stopwatch}
          title="Milliseconds"
          value={millis}
          accessory="now"
          extra={<Action title="Use as Input" icon={Icon.ArrowRight} onAction={() => onUse(millis)} />}
        />
        <CopyRow
          icon={Icon.Globe}
          title="UTC"
          value={formats(now, now, hour12).find((f) => f.label === "UTC")!.value}
        />
        <CopyRow icon={Icon.Code} title="ISO 8601" value={now.toISOString()} />
      </List.Section>
      <List.Section title="Examples">
        {[
          { value: "1782385809", label: "Seconds" },
          { value: "1782385809000", label: "Milliseconds" },
          { value: "0", label: "The Unix epoch (1970-01-01)" },
          { value: "2026-06-25T11:09:55Z", label: "Date string → timestamp" },
        ].map((ex) => (
          <List.Item
            key={ex.value}
            icon={Icon.Clock}
            title={ex.value}
            subtitle={ex.label}
            actions={
              <ActionPanel>
                <Action title="Use This Input" icon={Icon.ArrowRight} onAction={() => onUse(ex.value)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </>
  );
}

function Result({
  result,
}: {
  result: { parsed: ReturnType<typeof parseInput>; units: Record<Unit, string>; formats: Format[] };
}) {
  const { parsed, units, formats } = result;
  const interpretation =
    parsed.kind === "date"
      ? "Parsed as a date"
      : `Read as ${UNIT_LABEL[parsed.unit].toLowerCase()}${parsed.detected ? " (auto-detected)" : ""}`;

  return (
    <>
      <List.Section title="Date & Time" subtitle={interpretation}>
        {formats.map((f) => (
          <CopyRow key={f.label} icon={FORMAT_ICON[f.label] ?? Icon.Calendar} title={f.label} value={f.value} />
        ))}
      </List.Section>

      <List.Section title="Unix Timestamp">
        {UNITS.map((u) => (
          <CopyRow
            key={u}
            icon={Icon.Stopwatch}
            title={UNIT_LABEL[u]}
            value={units[u]}
            accessory={UNIT_ABBR[u]}
            highlight={parsed.kind === "timestamp" && u === parsed.unit}
          />
        ))}
      </List.Section>
    </>
  );
}

function CopyRow({
  icon,
  title,
  value,
  accessory,
  highlight,
  extra,
}: {
  icon: Icon;
  title: string;
  value: string;
  accessory?: string;
  highlight?: boolean;
  extra?: ReactNode;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (highlight) accessories.push({ tag: { value: "input", color: Color.Blue } });
  if (accessory) accessories.push({ text: accessory });
  return (
    <List.Item
      icon={icon}
      title={title}
      subtitle={value}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${title}`} content={value} />
          {extra}
        </ActionPanel>
      }
    />
  );
}
