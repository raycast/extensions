import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { copyGradient, notifyFailure, preferredFormat, withToast } from "../lib/command-ui";
import { favoriteId, Favorite, saveFavorite, SkySelection, useAsDefault } from "../lib/locations";
import { formatLabels, formats, SkyRequest, skyPage } from "../lib/skyfrom-api";
import { isDate, isLocalTime, localMinute, now, presets, SkyTime, timeLabel, timeLabels } from "../lib/time";
import { applyWallpaper, downloadWallpaper } from "../lib/wallpaper";

const copyShortcut = {
  macOS: { modifiers: ["cmd"], key: "c" },
  Windows: { modifiers: ["ctrl"], key: "c" },
} satisfies Keyboard.Shortcut;
const wallpaperShortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "w" },
  Windows: { modifiers: ["ctrl", "shift"], key: "w" },
} satisfies Keyboard.Shortcut;
export const favoriteShortcut = {
  macOS: { modifiers: ["cmd"], key: "f" },
  Windows: { modifiers: ["ctrl"], key: "f" },
} satisfies Keyboard.Shortcut;

export async function applyAndNotify(sky: SkyRequest) {
  const result = await withToast(
    "Setting wallpaper…",
    "Couldn’t set wallpaper",
    () => applyWallpaper(sky),
    ({ title }) => title,
  );
  if (result?.warning) await showToast({ style: Toast.Style.Failure, title: result.title, message: result.warning });
}

export function ExportActions({ sky }: { sky: SkyRequest }) {
  return (
    <>
      <ActionPanel.Section title="Export">
        {formats
          .filter((format) => format !== preferredFormat())
          .map((format) => (
            <Action
              key={format}
              title={`Copy ${formatLabels[format]}`}
              icon={Icon.Clipboard}
              onAction={() =>
                copyGradient(sky, format).catch((error) => notifyFailure("Couldn’t copy gradient", error))
              }
            />
          ))}
        <Action
          title="Download PNG"
          icon={Icon.Download}
          onAction={() =>
            withToast(
              "Downloading PNG…",
              "Couldn’t download PNG",
              () => downloadWallpaper(sky),
              () => "PNG saved",
            )
          }
        />
        <Action.CopyToClipboard title="Copy Gradient URL" content={skyPage(sky)} />
        <Action.OpenInBrowser title="Open in SkyFrom" url={skyPage(sky)} />
      </ActionPanel.Section>
    </>
  );
}

export function CopyAction({ sky }: { sky: SkyRequest }) {
  return (
    <Action
      title={`Copy ${formatLabels[preferredFormat()]}`}
      icon={Icon.Clipboard}
      shortcut={copyShortcut}
      onAction={() => copyGradient(sky).catch((error) => notifyFailure("Couldn’t copy gradient", error))}
    />
  );
}

export function WallpaperAction({ sky }: { sky: SkyRequest }) {
  return (
    <Action
      title="Set as Wallpaper"
      icon={Icon.Desktop}
      shortcut={wallpaperShortcut}
      onAction={() => applyAndNotify(sky)}
    />
  );
}

export function DefaultCityAction({ city }: Pick<SkySelection, "city">) {
  return (
    <Action
      title="Use City as Default"
      icon={Icon.Pin}
      onAction={() =>
        withToast(
          "Saving default…",
          "Couldn’t save default",
          () => useAsDefault({ kind: "city", city }),
          () => `${city.name} is your default city`,
        )
      }
    />
  );
}

export function SettingsAction() {
  return <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />;
}

export function FavoriteForm({ selection, favorite }: { selection: SkySelection; favorite?: Favorite }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle={favorite ? "Rename Favorite" : "Add Favorite"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Favorite"
            onSubmit={async ({ name }: { name: string }) => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Enter a name for this favorite.");
                return;
              }
              const task = await withToast(
                "Saving favorite…",
                "Couldn’t save favorite",
                async () => {
                  await saveFavorite({ ...selection, id: favoriteId(selection), name: trimmed });
                  return true;
                },
                () => "Favorite saved",
              );
              if (task) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={favorite?.name ?? `${selection.city.name} · ${timeLabel(selection.time)}`}
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

function TimeForm({ selection, onSelect }: { selection: SkySelection; onSelect: (time: SkyTime) => void }) {
  const { pop } = useNavigation();
  const current = localMinute(new Date(), selection.city.tz);
  const [date, setDate] = useState(
    selection.time.kind === "fixed"
      ? selection.time.local.slice(0, 10)
      : selection.time.kind === "preset"
        ? (selection.time.date ?? "")
        : current.slice(0, 10),
  );
  const [clock, setClock] = useState(
    selection.time.kind === "fixed" ? selection.time.local.slice(11) : current.slice(11),
  );
  const [choice, setChoice] = useState<string>(selection.time.kind === "preset" ? selection.time.event : "fixed");
  const [error, setError] = useState<{ field: "date" | "clock"; message: string }>();
  return (
    <Form
      navigationTitle={`Choose Time in ${selection.city.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Preview Sky"
            onSubmit={() => {
              const day = date.trim();
              if ((choice === "fixed" || day) && !isDate(day)) {
                setError({ field: "date", message: "Enter a date as YYYY-MM-DD." });
                return;
              }
              if (choice === "fixed") {
                const local = `${day}T${clock.trim()}`;
                if (!isLocalTime(local)) {
                  setError({ field: "clock", message: "Enter a 24-hour time as HH:MM." });
                  return;
                }
                onSelect({ kind: "fixed", local });
              } else {
                const preset = presets.find((item) => item === choice);
                if (!preset) return;
                onSelect({ kind: "preset", event: preset, date: day || undefined });
              }
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="kind"
        title="Time"
        value={choice}
        onChange={(value) => {
          setChoice(value);
          setError(undefined);
        }}
      >
        <Form.Dropdown.Item value="fixed" title="Custom Time" />
        {presets.map((preset) => (
          <Form.Dropdown.Item key={preset} value={preset} title={timeLabels[preset]} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="date"
        title="Local Date"
        placeholder={choice === "fixed" ? "YYYY-MM-DD" : "Today if left blank"}
        value={date}
        error={error?.field === "date" ? error.message : undefined}
        onChange={(value) => {
          setDate(value);
          setError(undefined);
        }}
      />
      {choice === "fixed" ? (
        <Form.TextField
          id="clock"
          title="Local Time"
          placeholder="HH:MM"
          value={clock}
          error={error?.field === "clock" ? error.message : undefined}
          onChange={(value) => {
            setClock(value);
            setError(undefined);
          }}
        />
      ) : null}
      <Form.Description text={`Times are local to ${selection.city.name} (${selection.city.tz}).`} />
    </Form>
  );
}

export function TimeActions({ selection, onSelect }: { selection: SkySelection; onSelect: (time: SkyTime) => void }) {
  const date =
    selection.time.kind === "fixed"
      ? selection.time.local.slice(0, 10)
      : selection.time.kind === "preset"
        ? selection.time.date
        : undefined;
  return (
    <ActionPanel.Submenu title="Choose Time" icon={Icon.Clock}>
      <Action.Push title="Choose Date and Time…" target={<TimeForm selection={selection} onSelect={onSelect} />} />
      <Action title="Now" onAction={() => onSelect(now)} />
      {presets.map((event) => (
        <Action key={event} title={timeLabels[event]} onAction={() => onSelect({ kind: "preset", event, date })} />
      ))}
    </ActionPanel.Submenu>
  );
}
