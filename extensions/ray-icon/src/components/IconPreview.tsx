import { Action, ActionPanel, Color, Detail, Icon, useNavigation, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { iconTitle } from "../lib/icons";
import { applyPreset, describePreset, IconSettings, PRESETS } from "../lib/settings";
import { ExportActions } from "./IconActions";
import { IconEditor } from "./IconEditor";
import { useIconPreview } from "./useIconPreview";
import { LibraryActions } from "./LibraryActions";
import { useLibrary } from "./useLibrary";
import { iconIdentity } from "../lib/library";

export function IconPreview(props: { settings: IconSettings }) {
  const [settings, setSettings] = useState(props.settings);
  const [showMetadata, setShowMetadata] = useCachedState("preview-metadata-visible", false);
  const { push } = useNavigation();
  const { library, refresh } = useLibrary();
  const update = (patch: Partial<IconSettings>) => setSettings((current) => ({ ...current, ...patch }));

  const { markdown, isLoading } = useIconPreview(settings);
  const presetIndex = settings.selectedPresetIndex;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={settings.customSvg ? "Custom SVG" : iconTitle(settings.icon ?? "")}
      metadata={
        showMetadata ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Icon"
              text={settings.customSvg ? "Custom SVG" : iconTitle(settings.icon ?? "")}
            />
            <Detail.Metadata.Label title="Fill" text={settings.backgroundFillType} />
            <Detail.Metadata.TagList title="Colors">
              <Detail.Metadata.TagList.Item
                text={settings.backgroundStartColor}
                color={settings.backgroundStartColor}
              />
              {settings.backgroundFillType === "Solid" ? null : (
                <Detail.Metadata.TagList.Item text={settings.backgroundEndColor} color={settings.backgroundEndColor} />
              )}
              <Detail.Metadata.TagList.Item text={`icon ${settings.iconColor}`} color={settings.iconColor} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title={settings.backgroundFillType === "Radial" ? "Position" : "Angle"}
              text={
                settings.backgroundFillType === "Radial" ? settings.backgroundPosition : `${settings.backgroundAngle}°`
              }
            />
            <Detail.Metadata.Label title="Radius" text={`${settings.backgroundRadius}px`} />
            <Detail.Metadata.Label title="Icon Size" text={`${settings.iconSize}px`} />
            <Detail.Metadata.Label title="Stroke" text={`${settings.backgroundStrokeSize}px`} />
            <Detail.Metadata.Label
              title="Glare / Noise"
              icon={settings.backgroundRadialGlare || settings.backgroundNoiseTexture ? Icon.Stars : undefined}
              text={`${settings.backgroundRadialGlare ? "on" : "off"} / ${settings.backgroundNoiseTexture ? `${settings.backgroundNoiseTextureOpacity}%` : "off"}`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="File Name" text={settings.fileName} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ExportActions settings={settings} />
          <LibraryActions
            settings={settings}
            isFavorite={library.favorites.some((item) => item.id === iconIdentity(settings))}
            onChange={refresh}
          />
          <Action
            title={showMetadata ? "Hide Preview Metadata" : "Show Preview Metadata"}
            icon={showMetadata ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            onAction={() => setShowMetadata((visible) => !visible)}
          />
          <ActionPanel.Section title="Adjust">
            <Action
              title="Edit Settings…"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => push(<IconEditor settings={settings} onSubmit={setSettings} />)}
            />
            <ActionPanel.Submenu title="Preset" icon={Icon.Swatch} shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}>
              {PRESETS.map((preset, index) => (
                <Action
                  key={index}
                  title={describePreset(preset)}
                  icon={{ source: Icon.CircleFilled, tintColor: preset.backgroundStartColor }}
                  onAction={() => setSettings((current) => applyPreset(current, index))}
                />
              ))}
            </ActionPanel.Submenu>
            <Action
              title="Next Preset"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd"], key: "]" }}
              onAction={() =>
                setSettings((current) => applyPreset(current, ((presetIndex ?? -1) + 1) % PRESETS.length))
              }
            />
            <Action
              title="Previous Preset"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
              onAction={() =>
                setSettings((current) =>
                  applyPreset(current, ((presetIndex ?? 0) - 1 + PRESETS.length) % PRESETS.length),
                )
              }
            />
            <Action
              title="Toggle Glare"
              icon={{ source: Icon.Sun, tintColor: Color.Yellow }}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={() => update({ backgroundRadialGlare: !settings.backgroundRadialGlare })}
            />
            <Action
              title="Toggle Noise"
              icon={Icon.Dot}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => update({ backgroundNoiseTexture: !settings.backgroundNoiseTexture })}
            />
            <ActionPanel.Submenu title="Corner Radius" icon={Icon.Circle} shortcut={Keyboard.Shortcut.Common.Refresh}>
              {[0, 64, 96, 128, 160, 256].map((radius) => (
                <Action key={radius} title={`${radius} Pixels`} onAction={() => update({ backgroundRadius: radius })} />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu title="Icon Size" icon={Icon.Maximize} shortcut={{ modifiers: ["cmd"], key: "i" }}>
              {[224, 288, 320, 352, 384, 416].map((size) => (
                <Action key={size} title={`${size} Pixels`} onAction={() => update({ iconSize: size })} />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
