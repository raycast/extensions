import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  openExtensionPreferences,
  showInFinder,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { copyGradient, notifyFailure, preferredFormat, withToast } from "../lib/command-ui";
import {
  favoriteId,
  Favorite,
  readLocations,
  removeFavorite,
  saveFavorite,
  SkySelection,
  useAsDefault,
} from "../lib/locations";
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
  if (result?.warning) await notifyFailure(result.title, new Error(result.warning));
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
              async () => showInFinder(await downloadWallpaper(sky)),
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

export function RemoveFavoriteAction({ id }: { id: string }) {
  return (
    <Action
      title="Remove Favorite"
      icon={Icon.StarDisabled}
      shortcut={favoriteShortcut}
      style={Action.Style.Destructive}
      onAction={async () => {
        try {
          const { favorites, defaultFavorite } = await readLocations();
          const favorite = favorites.find((item) => item.id === id);
          if (!favorite) return;
          const confirmed = await confirmAlert({
            title: "Remove Favorite?",
            message:
              id === defaultFavorite
                ? `“${favorite.name}” will be removed and your default favorite will be cleared.`
                : `“${favorite.name}” will be removed from Favorite Skies.`,
            primaryAction: { title: "Remove Favorite", style: Alert.ActionStyle.Destructive },
          });
          if (confirmed) {
            await withToast(
              "Removing favorite…",
              "Couldn’t remove favorite",
              () => removeFavorite(id),
              () => "Favorite removed",
            );
          }
        } catch (error) {
          await notifyFailure("Couldn’t remove favorite", error);
        }
      }}
    />
  );
}

export function FavoriteForm({ selection, favorite }: { selection: SkySelection; favorite?: Favorite }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: favorite?.name ?? `${selection.city.name} · ${timeLabel(selection.time)}` },
    validation: { name: (value) => (value?.trim() ? undefined : "Enter a name for this favorite.") },
    async onSubmit({ name }) {
      const saved = await withToast(
        "Saving favorite…",
        "Couldn’t save favorite",
        async () => {
          await saveFavorite({ ...selection, id: favoriteId(selection), name: name.trim() });
          return true;
        },
        () => "Favorite saved",
      );
      if (saved) pop();
    },
  });

  return (
    <Form
      navigationTitle={favorite ? "Rename Favorite" : "Add Favorite"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Favorite" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Lisbon Sunset" />
    </Form>
  );
}

function TimeForm({ selection, onSelect }: { selection: SkySelection; onSelect: (time: SkyTime) => void }) {
  const { pop } = useNavigation();
  const current = localMinute(new Date(), selection.city.tz);
  const time = selection.time;
  const { handleSubmit, itemProps, values } = useForm<{ kind: string; date: string; clock: string }>({
    initialValues: {
      kind: time.kind === "preset" ? time.event : "fixed",
      date:
        time.kind === "fixed"
          ? time.local.slice(0, 10)
          : time.kind === "preset"
            ? (time.date ?? "")
            : current.slice(0, 10),
      clock: time.kind === "fixed" ? time.local.slice(11) : current.slice(11),
    },
    validation: {
      date(value) {
        const date = value?.trim() ?? "";
        if ((values.kind === "fixed" || date) && !isDate(date)) return "Enter a date as YYYY-MM-DD.";
      },
      clock(value) {
        if (values.kind === "fixed" && !isLocalTime(`2000-01-01T${value?.trim() ?? ""}`))
          return "Enter a 24-hour time as HH:MM.";
      },
    },
    onSubmit({ kind, date, clock }) {
      const day = date.trim();
      if (kind === "fixed") {
        onSelect({ kind: "fixed", local: `${day}T${clock.trim()}` });
      } else {
        const preset = presets.find((item) => item === kind);
        if (!preset) return;
        onSelect({ kind: "preset", event: preset, date: day || undefined });
      }
      pop();
    },
  });
  return (
    <Form
      navigationTitle={`Choose Time in ${selection.city.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Sky" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.kind} title="Time">
        <Form.Dropdown.Item value="fixed" title="Custom Time" />
        {presets.map((preset) => (
          <Form.Dropdown.Item key={preset} value={preset} title={timeLabels[preset]} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        {...itemProps.date}
        title="Local Date"
        placeholder={values.kind === "fixed" ? "2026-06-12" : "2026-06-12 or leave blank for today"}
      />
      {values.kind === "fixed" ? <Form.TextField {...itemProps.clock} title="Local Time" placeholder="18:30" /> : null}
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
