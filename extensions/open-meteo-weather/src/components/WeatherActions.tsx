import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ViewId, WeatherSettings } from "../hooks/useWeatherSettings";
import { formatPlace } from "../lib/api";
import { ShareMode, shareForecastImage, shareRadarGif } from "../lib/share";
import { THEME_INFO } from "../lib/showcase";
import { LocationSearch } from "./LocationSearch";

export function WeatherActions(props: {
  settings: WeatherSettings;
  refresh: () => void;
  /** Plain-text summary for "Copy Summary"; omit when there is nothing to copy yet. */
  summary?: string;
  /** Builds the full-size SVG for the image share actions. */
  shareSvg?: () => string;
  /** Path of the animated radar GIF, for the GIF share actions. */
  shareGifPath?: string;
  /** View-specific actions, rendered in their own section (e.g. radar zoom/pan). */
  children?: React.ReactNode;
}) {
  const s = props.settings;
  // The PNG pipeline rasterizes via macOS QuickLook; the GIF is already a file.
  const canShareImage = props.shareSvg && process.platform === "darwin";
  const baseName = (s.active?.name ?? "weather").toLowerCase().replace(/\s+/g, "-");

  const shareImage = async (mode: ShareMode) => {
    try {
      await shareForecastImage(props.shareSvg!(), mode, baseName);
    } catch (error) {
      await showFailureToast(error, { title: "Could not render the image" });
    }
  };
  const shareGif = async (mode: ShareMode) => {
    try {
      await shareRadarGif(props.shareGifPath!, mode, baseName);
    } catch (error) {
      await showFailureToast(error, { title: "Could not share the animation" });
    }
  };

  const VIEWS: { id: ViewId; title: string; icon: Icon }[] = [
    { id: "list", title: "Forecast List", icon: Icon.List },
    { id: "today", title: "Today View", icon: Icon.Sun },
    { id: "radar", title: "Radar", icon: Icon.Globe },
  ];
  const next = VIEWS[(VIEWS.findIndex((v) => v.id === s.view) + 1) % VIEWS.length];
  // Sections are ordered by frequency of use; settings sit last.
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={`Open ${next.title}`}
          icon={next.icon}
          onAction={() => s.setView(next.id)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        <ActionPanel.Submenu title="Switch View" icon={Icon.AppWindow}>
          {VIEWS.map((v) => (
            <Action
              key={v.id}
              title={v.title}
              icon={s.view === v.id ? Icon.CheckCircle : v.icon}
              onAction={() => s.setView(v.id)}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      {props.children}
      <ActionPanel.Section title="Locations">
        {s.locations.length > 1 && s.active && (
          <Action
            title={`Switch to ${
              s.locations[(s.locations.findIndex((l) => l.id === s.active!.id) + 1) % s.locations.length].name
            }`}
            icon={Icon.Pin}
            onAction={s.nextLocation}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "]" },
              Windows: { modifiers: ["ctrl", "shift"], key: "]" },
            }}
          />
        )}
        {s.locations.length > 1 && (
          <ActionPanel.Submenu
            title="Switch Location"
            icon={Icon.Pin}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "l" },
              Windows: { modifiers: ["ctrl", "shift"], key: "l" },
            }}
          >
            {s.locations.map((l) => (
              <Action
                key={l.id}
                title={formatPlace(l)}
                icon={s.active?.id === l.id ? Icon.CheckCircle : Icon.Circle}
                onAction={() => s.setActiveId(l.id)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        <Action.Push
          title="Add Location"
          icon={Icon.Plus}
          target={
            <LocationSearch
              popOnSelect
              navigationTitle="Add Location"
              emptyTitle="Add a location"
              onSelect={s.addLocation}
            />
          }
          shortcut={{ macOS: { modifiers: ["cmd"], key: "l" }, Windows: { modifiers: ["ctrl"], key: "l" } }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Forecast">
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={props.refresh}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
        <Action
          title={`Show ${s.forecastDays === 7 ? 16 : 7}-Day Forecast`}
          icon={Icon.Calendar}
          onAction={s.toggleForecastDays}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Share">
        {/* Not Common.Duplicate: that constant is ⌘D on macOS, which collides
            with the 7/16-day forecast toggle. */}
        {props.summary && (
          <Action.CopyToClipboard
            title="Copy Summary"
            content={props.summary}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "t" },
              Windows: { modifiers: ["ctrl", "shift"], key: "t" },
            }}
          />
        )}
        {canShareImage && (
          <>
            <Action
              title="Copy Image"
              icon={Icon.Image}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => shareImage("copy")}
            />
            <Action
              title="Paste Image"
              icon={Icon.Clipboard}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "v" },
                Windows: { modifiers: ["ctrl", "shift"], key: "v" },
              }}
              onAction={() => shareImage("paste")}
            />
            <Action title="Save Image to Downloads" icon={Icon.Download} onAction={() => shareImage("save")} />
          </>
        )}
        {props.shareGifPath && (
          <>
            <Action
              title="Copy Animated GIF"
              icon={Icon.FilmStrip}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "g" },
                Windows: { modifiers: ["ctrl", "shift"], key: "g" },
              }}
              onAction={() => shareGif("copy")}
            />
            <Action title="Paste Animated GIF" icon={Icon.Clipboard} onAction={() => shareGif("paste")} />
            <Action title="Save GIF to Downloads" icon={Icon.Download} onAction={() => shareGif("save")} />
          </>
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Settings">
        <Action
          title={`Switch to °${s.units === "celsius" ? "F" : "C"}`}
          icon={Icon.Temperature}
          onAction={s.toggleUnits}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "u" }, Windows: { modifiers: ["ctrl"], key: "u" } }}
        />
        <ActionPanel.Submenu
          title="Switch Theme"
          icon={Icon.Brush}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "t" }, Windows: { modifiers: ["ctrl"], key: "t" } }}
        >
          {THEME_INFO.map((t) => (
            <Action
              key={t.id}
              title={t.title}
              icon={s.theme === t.id ? Icon.CheckCircle : Icon.Circle}
              onAction={() => s.setTheme(t.id)}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      {s.active && (
        <ActionPanel.Section>
          <Action
            title={`Remove ${s.active.name}`}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={s.removeActive}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
