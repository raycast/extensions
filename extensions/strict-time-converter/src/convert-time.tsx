import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { formatTime, parseInput } from "./lib/time";
import { FORMAT_HELP } from "./lib/format-help";

const SOURCE_LABELS = {
  current: "Current Time · Updates Every Second",
  seconds: "Unix Timestamp in Seconds",
  milliseconds: "Unix Timestamp in Milliseconds",
  date: "Date to Timestamp",
};

// These are custom actions, not the standard Duplicate or New item actions.
const COPY_SECONDS_SHORTCUT: Keyboard.Shortcut = {
  modifiers: ["cmd", "shift"],
  key: "s",
};
const SHOW_CURRENT_TIME_SHORTCUT: Keyboard.Shortcut = {
  modifiers: ["cmd"],
  key: "n",
};

function InputActions({
  onInput,
  input,
}: {
  onInput: (text: string) => void;
  input: string;
}) {
  async function readClipboard() {
    try {
      const text = await Clipboard.readText();
      if (text?.trim()) {
        onInput(text.trim());
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text in clipboard",
        });
      }
    } catch (error) {
      await showFailureToast(error, {
        title: "Could not read clipboard",
      });
    }
  }

  return (
    <>
      <ActionPanel.Section title="Input">
        <Action
          title="Read Clipboard"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onAction={readClipboard}
        />
        <Action
          title="Show Current Time"
          icon={Icon.Clock}
          shortcut={SHOW_CURRENT_TIME_SHORTCUT}
          onAction={() => onInput("")}
        />
        <Action
          title="Try Unix Seconds"
          icon={Icon.Number00}
          onAction={() => onInput("1700000000")}
        />
        <Action
          title="Try Unix Milliseconds"
          icon={Icon.Number00}
          onAction={() => onInput("1700000000123")}
        />
        <Action
          title="Try Calendar Date"
          icon={Icon.Calendar}
          onAction={() => onInput("2026-10-15 12:00:00")}
        />
        <Action
          title="Try Chinese Date"
          icon={Icon.Calendar}
          onAction={() => onInput("2026年10月15日 下午3点04分05秒")}
        />
        <Action
          title="Try RFC Mail Date"
          icon={Icon.Envelope}
          onAction={() => onInput("Thu, 15 Oct 2026 12:00:00 +0800")}
        />
        {/^(?:(?:us|eu):\s*)?\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/i.test(input) && (
          <>
            <Action
              title="Parse as Month/Day/Year"
              icon={Icon.Calendar}
              onAction={() =>
                onInput(`us:${input.replace(/^(us|eu):\s*/i, "")}`)
              }
            />
            <Action
              title="Parse as Day/Month/Year"
              icon={Icon.Calendar}
              onAction={() =>
                onInput(`eu:${input.replace(/^(us|eu):\s*/i, "")}`)
              }
            />
          </>
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
        <Action.Push
          title="Show Supported Formats"
          icon={Icon.QuestionMarkCircle}
          target={
            <Detail
              markdown={FORMAT_HELP}
              navigationTitle="Time Format Reference"
            />
          }
        />
      </ActionPanel.Section>
    </>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.ConvertTime }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState(props.arguments.input ?? "");
  const [timezone, setTimezone] = useState<string>(
    preferences.timezone ?? "local",
  );
  const [now, setNow] = useState(Date.now);
  const result = parseInput(
    input,
    timezone,
    now,
    preferences.dateOrder ?? "auto",
  );
  const isCurrent = result.ok && result.source === "current";

  useEffect(() => {
    if (!isCurrent) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isCurrent]);

  const formatted = result.ok
    ? formatTime(result.milliseconds, timezone)
    : undefined;
  const rows = formatted
    ? [
        {
          id: "date",
          label:
            timezone === "Asia/Shanghai"
              ? "Beijing Time"
              : timezone === "UTC"
                ? "UTC Date and Time"
                : "Local Date and Time",
          value: formatted.dateTime,
          hint: `${formatted.timezone} · ${formatted.offset}`,
          icon: Icon.Calendar,
          color: Color.Blue,
        },
        {
          id: "seconds",
          label: "Unix Seconds",
          value: formatted.seconds,
          hint: formatted.hasMilliseconds
            ? "Seconds · Rounded Down"
            : "Seconds · Usually 10 Digits",
          icon: Icon.Number00,
          color: Color.Green,
        },
        {
          id: "milliseconds",
          label: "Unix Milliseconds",
          value: formatted.milliseconds,
          hint: "Milliseconds · Usually 13 Digits",
          icon: Icon.Number00,
          color: Color.Orange,
        },
        {
          id: "iso",
          label: "ISO 8601",
          value: formatted.iso,
          hint: "Z Means UTC",
          icon: Icon.Code,
          color: Color.Purple,
        },
        {
          id: "local-iso",
          label: "ISO in Selected Zone",
          value: formatted.localIso,
          hint: "Explicit UTC Offset",
          icon: Icon.Code,
          color: Color.Purple,
        },
        {
          id: "rfc",
          label: "RFC 2822",
          value: formatted.rfc2822,
          hint: "Mail Date · Seconds",
          icon: Icon.Envelope,
          color: Color.SecondaryText,
        },
        {
          id: "http",
          label: "HTTP Date",
          value: formatted.http,
          hint: "GMT · Seconds",
          icon: Icon.Globe,
          color: Color.SecondaryText,
        },
        {
          id: "compact",
          label: "Compact Date and Time",
          value: formatted.compact,
          hint: "YYYYMMDDHHmmss · Seconds",
          icon: Icon.Calendar,
          color: Color.Blue,
        },
        ...(timezone === "UTC"
          ? []
          : [
              {
                id: "utc",
                label: "UTC Date and Time",
                value: formatted.utc,
                hint: "UTC+00:00",
                icon: Icon.Globe,
                color: Color.SecondaryText,
              },
            ]),
      ]
    : [];

  return (
    <List
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder="Timestamp or date; ⌘K for formats"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Display time zone; also used for dates without an offset"
          value={timezone}
          onChange={setTimezone}
        >
          <List.Dropdown.Item
            title="Beijing Time"
            value="Asia/Shanghai"
            icon={Icon.Clock}
          />
          <List.Dropdown.Item
            title="Local Time Zone"
            value="local"
            icon={Icon.Desktop}
          />
          <List.Dropdown.Item title="UTC" value="UTC" icon={Icon.Globe} />
        </List.Dropdown>
      }
    >
      {result.ok && formatted ? (
        <List.Section
          title={
            result.inputFormat
              ? `Recognized: ${result.inputFormat}`
              : SOURCE_LABELS[result.source]
          }
          subtitle="↵ Copy Selected Result · ⌘K More Actions"
        >
          {rows.map((row) => (
            <List.Item
              key={row.id}
              id={row.id}
              title={row.value}
              subtitle={row.label}
              icon={{ source: row.icon, tintColor: row.color }}
              accessories={[{ text: row.hint }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy Results">
                    <Action.CopyToClipboard
                      title={`Copy ${row.label}`}
                      content={row.value}
                    />
                    <Action.CopyToClipboard
                      title="Copy Unix Seconds"
                      content={formatted.seconds}
                      shortcut={COPY_SECONDS_SHORTCUT}
                    />
                    <Action.CopyToClipboard
                      title="Copy Unix Milliseconds"
                      content={formatted.milliseconds}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Date and Time"
                      content={formatted.dateTime}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    />
                  </ActionPanel.Section>
                  <InputActions onInput={setInput} input={input} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot Convert This Input"
          description={result.ok ? "Enter a timestamp or date." : result.error}
          actions={
            <ActionPanel>
              <InputActions onInput={setInput} input={input} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
