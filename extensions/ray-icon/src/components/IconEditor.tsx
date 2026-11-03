import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { applyAppearance, luminance } from "../lib/appearance";
import { ICON_NAMES, iconTitle } from "../lib/icons";
import { previewFile } from "../lib/render";
import { applyPreset, describePreset, FillType, IconSettings, PRESETS } from "../lib/settings";
import { IconSettingField, TextSetting } from "./IconSettingField";
import { IconSettingsForm } from "./IconSettingsForm";
import { useIconPreview } from "./useIconPreview";

type Choice = { id: string; title: string; settings: IconSettings };

function SettingsPicker(props: {
  title: string;
  choices: Choice[];
  selectedId?: string;
  onSubmit: (settings: IconSettings) => void;
}) {
  const { pop } = useNavigation();
  const [selectedId, setSelectedId] = useState(props.selectedId ?? props.choices[0]?.id);
  const selected = props.choices.find((choice) => choice.id === selectedId) ?? props.choices[0];
  const { markdown, isLoading } = useIconPreview(selected.settings);
  const thumbnails = useMemo(() => props.choices.map((choice) => previewFile(choice.settings)), [props.choices]);

  return (
    <List
      navigationTitle={props.title}
      searchBarPlaceholder={`Search ${props.title.toLowerCase()}…`}
      isShowingDetail
      isLoading={isLoading}
      selectedItemId={selectedId}
      onSelectionChange={(id) => {
        if (id) setSelectedId(id);
      }}
    >
      {props.choices.map((choice, index) => (
        <List.Item
          key={choice.id}
          id={choice.id}
          title={choice.title}
          icon={thumbnails[index]}
          detail={<List.Item.Detail markdown={markdown} isLoading={isLoading} />}
          actions={
            <ActionPanel>
              <Action
                title="Use Selection"
                icon={Icon.Check}
                onAction={() => {
                  props.onSubmit(choice.settings);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** Settings stay beside a full preview; pickers preview candidates before applying them. */
export function IconEditor(props: { settings: IconSettings; onSubmit: (settings: IconSettings) => void }) {
  const { pop, push } = useNavigation();
  const [settings, setSettings] = useState(props.settings);
  const [showMetadata, setShowMetadata] = useCachedState("preview-metadata-visible", false);
  const { markdown, isLoading } = useIconPreview(settings, showMetadata ? 200 : 320);
  const update = (patch: Partial<IconSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const choose = (title: string, choices: Choice[], selectedId?: string) =>
    push(<SettingsPicker title={title} choices={choices} selectedId={selectedId} onSubmit={setSettings} />);
  const editAll = () => push(<IconSettingsForm settings={settings} onSubmit={setSettings} />);
  const editField = (title: string, field: TextSetting) =>
    push(<IconSettingField title={title} field={field} settings={settings} onSubmit={setSettings} />);
  const colorRow = (title: string, field: Exclude<TextSetting, "fileName">) => ({
    id: field,
    title,
    value: settings[field],
    icon: { source: Icon.CircleFilled, tintColor: settings[field] },
    edit: () => editField(title, field),
  });
  const brightness = (
    settings.backgroundFillType === "Solid"
      ? [settings.backgroundStartColor]
      : [settings.backgroundStartColor, settings.backgroundEndColor]
  ).map(luminance);
  const appearance = brightness.every((value) => value >= 0.65)
    ? "Light"
    : brightness.every((value) => value <= 0.12)
      ? "Dark"
      : "Custom";

  const rows = [
    {
      id: "icon",
      title: "Icon",
      value: settings.customSvg ? "Custom SVG" : iconTitle(settings.icon ?? ""),
      icon: Icon.Brush,
      edit: () =>
        settings.customSvg
          ? editAll()
          : choose(
              "Icons",
              ICON_NAMES.map((icon) => ({
                id: icon,
                title: iconTitle(icon),
                settings: { ...settings, icon, customSvg: undefined },
              })),
              settings.icon,
            ),
    },
    {
      id: "preset",
      title: "Preset",
      value: settings.selectedPresetIndex === null ? "Custom" : `Preset ${settings.selectedPresetIndex}`,
      icon: Icon.Swatch,
      edit: () =>
        choose(
          "Presets",
          PRESETS.map((preset, index) => ({
            id: String(index),
            title: describePreset(preset),
            settings: applyPreset(settings, index),
          })),
          String(settings.selectedPresetIndex ?? 0),
        ),
    },
    {
      id: "appearance",
      title: "Appearance",
      value: appearance,
      icon: Icon.Circle,
      edit: () =>
        choose(
          "Appearance",
          (["light", "dark"] as const).map((appearance) => ({
            id: appearance,
            title: appearance === "light" ? "Light" : "Dark",
            settings: applyAppearance(settings, appearance),
          })),
        ),
    },
    {
      id: "fill",
      title: "Fill",
      value: settings.backgroundFillType,
      icon: Icon.Brush,
      edit: () =>
        choose(
          "Fill",
          (["Linear", "Radial", "Solid"] satisfies FillType[]).map((fill) => ({
            id: fill,
            title: fill,
            settings: { ...settings, backgroundFillType: fill, selectedPresetIndex: null },
          })),
          settings.backgroundFillType,
        ),
    },
    colorRow(settings.backgroundFillType === "Solid" ? "Background Color" : "Start Color", "backgroundStartColor"),
    ...(settings.backgroundFillType === "Solid" ? [] : [colorRow("End Color", "backgroundEndColor")]),
    colorRow("Icon Color", "iconColor"),
    {
      id: "radius",
      title: "Corner Radius",
      value: `${settings.backgroundRadius}px`,
      icon: Icon.Circle,
      edit: () =>
        choose(
          "Corner Radius",
          [0, 64, 96, 128, 160, 256].map((radius) => ({
            id: String(radius),
            title: `${radius} Pixels`,
            settings: { ...settings, backgroundRadius: radius },
          })),
          String(settings.backgroundRadius),
        ),
    },
    {
      id: "size",
      title: "Icon Size",
      value: `${settings.iconSize}px`,
      icon: Icon.Maximize,
      edit: () =>
        choose(
          "Icon Size",
          [224, 288, 320, 352, 384, 416].map((size) => ({
            id: String(size),
            title: `${size} Pixels`,
            settings: { ...settings, iconSize: size },
          })),
          String(settings.iconSize),
        ),
    },
    {
      id: "glare",
      title: "Glare",
      value: settings.backgroundRadialGlare ? "On" : "Off",
      icon: Icon.Sun,
      edit: () => update({ backgroundRadialGlare: !settings.backgroundRadialGlare }),
    },
    {
      id: "noise",
      title: "Noise",
      value: settings.backgroundNoiseTexture ? "On" : "Off",
      icon: Icon.Dot,
      edit: () => update({ backgroundNoiseTexture: !settings.backgroundNoiseTexture }),
    },
    {
      id: "fileName",
      title: "File Name",
      value: settings.fileName,
      icon: Icon.Document,
      edit: () => editField("File Name", "fileName"),
    },
    {
      id: "advanced",
      title: "Advanced Settings",
      value: "Border, Offsets, SVG…",
      icon: Icon.Gear,
      edit: editAll,
    },
  ];

  return (
    <List navigationTitle="Edit Icon" searchBarPlaceholder="Search settings…" isShowingDetail isLoading={isLoading}>
      {rows.map((row) => (
        <List.Item
          key={row.id}
          id={row.id}
          title={row.title}
          icon={row.icon}
          keywords={[row.value]}
          accessories={[{ text: row.value, tooltip: row.value }]}
          detail={
            <List.Item.Detail
              markdown={markdown}
              isLoading={isLoading}
              metadata={
                showMetadata ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="File Name" text={settings.fileName} />
                    <List.Item.Detail.Metadata.Label title="Fill" text={settings.backgroundFillType} />
                    <List.Item.Detail.Metadata.TagList title="Colors">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={settings.backgroundStartColor}
                        color={settings.backgroundStartColor}
                      />
                      {settings.backgroundFillType !== "Solid" && (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={settings.backgroundEndColor}
                          color={settings.backgroundEndColor}
                        />
                      )}
                      <List.Item.Detail.Metadata.TagList.Item text={settings.iconColor} color={settings.iconColor} />
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                ) : undefined
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title={row.id === "glare" || row.id === "noise" ? `Toggle ${row.title}` : `Edit ${row.title}`}
                icon={row.icon}
                onAction={row.edit}
              />
              <Action
                title="Apply Changes"
                icon={Icon.Check}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => {
                  props.onSubmit(settings);
                  pop();
                }}
              />
              <Action
                title="Advanced Settings"
                icon={Icon.Gear}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={editAll}
              />
              <Action
                title={showMetadata ? "Hide Preview Metadata" : "Show Preview Metadata"}
                icon={showMetadata ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                onAction={() => setShowMetadata((visible) => !visible)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
