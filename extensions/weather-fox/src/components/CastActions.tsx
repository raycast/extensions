import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { LocationSearch } from "./LocationSearch";
import { WeatherSettings } from "../hooks/useWeatherSettings";
import { CastScene, buildCastShareSvg } from "../lib/cast";
import { ShareMode, shareForecastImage } from "../lib/share";

/** Shared action panel for the Cast command's live scene. */
export function CastActions(props: {
  /** Undefined while loading or after a failed fetch; the share section is hidden then. */
  scene: CastScene | undefined;
  settings: WeatherSettings;
  refresh: () => void;
  extra?: React.ReactNode;
}) {
  const { scene, settings: s } = props;
  const summary =
    scene && `${scene.place}: ${scene.conditionLabel}, ${Math.round(scene.temperature)}°${scene.unitSymbol}`;
  const canShareImage = scene !== undefined && process.platform === "darwin";
  const baseName = `cast-${(s.active?.name ?? "weather").toLowerCase().replace(/\s+/g, "-")}`;

  const shareImage = async (mode: ShareMode) => {
    if (!scene) return;
    try {
      await shareForecastImage(buildCastShareSvg(scene), mode, baseName);
    } catch (error) {
      await showFailureToast(error, { title: "Could not render the image" });
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {props.extra}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={props.refresh}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Locations">
        {s.locations.length > 1 && s.active && (
          <Action
            title={`Switch to ${s.locations[(s.locations.findIndex((l) => l.id === s.active!.id) + 1) % s.locations.length].name}`}
            icon={Icon.Pin}
            onAction={s.nextLocation}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "]" },
              Windows: { modifiers: ["ctrl", "shift"], key: "]" },
            }}
          />
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
      <ActionPanel.Section title="Share">
        {summary && (
          <Action.CopyToClipboard
            title="Copy Summary"
            content={summary}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "t" },
              Windows: { modifiers: ["ctrl", "shift"], key: "t" },
            }}
          />
        )}
        {canShareImage && (
          <>
            <Action
              title="Copy Scene Image"
              icon={Icon.Image}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => shareImage("copy")}
            />
            <Action
              title="Paste Scene Image"
              icon={Icon.Clipboard}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "v" },
                Windows: { modifiers: ["ctrl", "shift"], key: "v" },
              }}
              onAction={() => shareImage("paste")}
            />
            <Action title="Save Scene to Downloads" icon={Icon.Download} onAction={() => shareImage("save")} />
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
      </ActionPanel.Section>
    </ActionPanel>
  );
}
