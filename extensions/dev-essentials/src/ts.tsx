import { Action, ActionPanel, Icon, LaunchProps, List, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "./lib/errors";
import { formatTime, parseTimeInput, UnixUnit } from "./lib/timestamp";

const UNITS: { value: UnixUnit; title: string }[] = [
  { value: "auto", title: "Auto-Detect Unit" },
  { value: "seconds", title: "Seconds" },
  { value: "milliseconds", title: "Milliseconds" },
  { value: "microseconds", title: "Microseconds" },
  { value: "nanoseconds", title: "Nanoseconds" },
];

const EXAMPLES = [
  "1700000000",
  "1700000000123",
  "2024-01-01T09:30:00+07:00",
  "10 seconds ago",
  "1 day ago",
  "in 2 hours",
];

export default function Command(props: LaunchProps<{ arguments: Arguments.Ts }>) {
  const [input, setInput] = useState(props.arguments.input ?? props.fallbackText ?? "");
  const [unit, setUnit] = useState<UnixUnit>("auto");
  const [tick, setTick] = useState(0);
  const isNow = !input.trim() || /^now$/i.test(input.trim());

  // Keep "now" live; any other input is evaluated once, relative to when it was typed.
  useEffect(() => {
    if (!isNow) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isNow]);

  const result = useMemo(() => {
    try {
      const now = new Date();
      const parsed = parseTimeInput(input, now, unit);
      return { parsed, formats: formatTime(parsed.date, now) };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }, [input, unit, tick]);

  return (
    <List
      searchText={input}
      onSearchTextChange={setInput}
      filtering={false}
      searchBarPlaceholder="Unix timestamp, ISO date-time, or duration like 10 seconds ago"
      searchBarAccessory={
        <List.Dropdown tooltip="Unix Timestamp Unit" storeValue onChange={(v) => setUnit(v as UnixUnit)}>
          {UNITS.map((u) => (
            <List.Dropdown.Item key={u.value} value={u.value} title={u.title} />
          ))}
        </List.Dropdown>
      }
    >
      {"error" in result ? (
        <List.EmptyView
          icon={Icon.QuestionMarkCircle}
          title={result.error}
          description={`Try: ${EXAMPLES.join("  ·  ")}`}
        />
      ) : (
        <List.Section title={result.parsed.label} subtitle={result.parsed.kind === "now" ? "live" : input.trim()}>
          {result.formats.map((format) => (
            <List.Item
              key={format.id}
              icon={Icon.Clock}
              title={format.value}
              accessories={[{ text: format.label }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={format.value} />
                  <Action.Paste content={format.value} />
                  <Action.CopyToClipboard
                    title="Copy All Formats"
                    content={result.formats.map((f) => `${f.label}: ${f.value}`).join("\n")}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
