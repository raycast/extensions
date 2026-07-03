import { Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  COLOR_MODELS,
  type ColorModel,
  type Rgba,
  channelDisplay,
  channelsOf,
  colorName,
  harmonies,
  modelString,
  parseColor,
  rgbToHsl,
  shades,
  swatchDataUri,
  toHex,
  withChannel,
} from "./lib/color";
import { renderColorPanel } from "./lib/color-slider";

type View = "overview" | ColorModel;

const MODEL_LABEL: Record<ColorModel, string> = { oklch: "OKLCH", hwb: "HWB", hsl: "HSL", hsv: "HSV", rgb: "RGB" };
const EDIT_DEFAULT: ColorModel = "hsl";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [view, setView] = useState<View>("overview");

  // Prefill from the clipboard on open if it holds a recognizable color.
  useEffect(() => {
    (async () => {
      const clipboard = (await Clipboard.readText())?.trim();
      if (clipboard && parseColor(clipboard)) setSearchText(clipboard);
    })();
  }, []);

  const color = useMemo(() => parseColor(searchText), [searchText]);
  const editing = view !== "overview";

  return (
    <List
      isShowingDetail={!!color && editing}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a color — #1000be, rgb(16 0 190), hsl(245 100% 37%), oklch(0.37 0.25 266), rebeccapurple"
      navigationTitle={
        color
          ? `${toHex(color, color.a < 1)}${editing ? ` · ${MODEL_LABEL[view as ColorModel]}` : ""}`
          : "Color Converter"
      }
      searchBarAccessory={
        <List.Dropdown tooltip="View" value={view} onChange={(next) => setView(next as View)}>
          <List.Dropdown.Item icon={Icon.Swatch} title="Overview" value="overview" />
          <List.Dropdown.Section title="Edit with sliders">
            {COLOR_MODELS.map((m) => (
              <List.Dropdown.Item key={m} icon={Icon.Pencil} title={MODEL_LABEL[m]} value={m} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!color ? (
        <List.EmptyView
          icon={searchText ? Icon.ExclamationMark : Icon.EyeDropper}
          title={searchText ? "Not a recognized color" : "Enter a color"}
          description="Examples: #1000be, rgb(16 0 190), hsl(245 100% 37%), hwb(245 0% 25%), oklch(0.37 0.25 266), teal, rebeccapurple"
        />
      ) : editing ? (
        <EditorView
          color={color}
          model={view as ColorModel}
          onChange={setSearchText}
          onDone={() => setView("overview")}
        />
      ) : (
        <Overview color={color} onUse={setSearchText} onEdit={() => setView(EDIT_DEFAULT)} />
      )}
    </List>
  );
}

function Overview({ color, onUse, onEdit }: { color: Rgba; onUse: (s: string) => void; onEdit: () => void }) {
  const name = colorName(color);
  const formats: { label: string; value: string }[] = [
    ...(name ? [{ label: "Name", value: name }] : []),
    { label: "HEX", value: toHex(color, color.a < 1) },
    { label: "RGB", value: modelString(color, "rgb") },
    { label: "HSL", value: modelString(color, "hsl") },
    { label: "HSV", value: modelString(color, "hsv") },
    { label: "HWB", value: modelString(color, "hwb") },
    { label: "OKLCH", value: modelString(color, "oklch") },
  ];
  const allFormats = formats.map((f) => f.value).join("\n");

  const editAction = (
    <Action
      icon={Icon.Pencil}
      title="Edit with Sliders"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={onEdit}
    />
  );

  return (
    <>
      <List.Section title="Formats">
        {formats.map((f) => (
          <List.Item
            key={f.label}
            icon={{ source: swatchDataUri(color) }}
            title={f.value}
            accessories={[{ tag: f.label }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={`Copy ${f.label}`} content={f.value} />
                <Action.CopyToClipboard
                  title="Copy All Formats"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  content={allFormats}
                />
                {editAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Shades & Tints">
        {shades(color).map((shade, i) => {
          const hex = toHex(shade, false);
          return (
            <List.Item
              key={`shade-${i}`}
              icon={{ source: swatchDataUri(shade) }}
              title={hex}
              accessories={[{ text: `L ${Math.round(rgbToHsl(shade).l)}%` }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Hex" content={hex} />
                  <Action icon={Icon.ArrowUp} title="Use as Base Color" onAction={() => onUse(hex)} />
                  {editAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Harmonies">
        {harmonies(color).map(({ label, color: harmony }) => {
          const hex = toHex(harmony, false);
          return (
            <List.Item
              key={label}
              icon={{ source: swatchDataUri(harmony) }}
              title={label}
              accessories={[{ text: hex }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Hex" content={hex} />
                  <Action icon={Icon.ArrowUp} title="Use as Base Color" onAction={() => onUse(hex)} />
                  {editAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </>
  );
}

function EditorView({
  color,
  model,
  onChange,
  onDone,
}: {
  color: Rgba;
  model: ColorModel;
  onChange: (s: string) => void;
  onDone: () => void;
}) {
  const channels = channelsOf(color, model);
  // One image for the whole panel, shared by every row, so moving the selection
  // doesn't reload it — only an actual value change does.
  const panel = `![${MODEL_LABEL[model]}](${renderColorPanel(color, model)})`;
  const set = (index: number, value: number) => onChange(modelString(withChannel(color, model, index, value), model));

  return (
    <List.Section title={`${MODEL_LABEL[model]} channels`} subtitle="⌘←/→ adjust · ⌘⇧←/→ ×5">
      {channels.map((channel, i) => (
        <List.Item
          key={channel.label}
          icon={{ source: swatchDataUri(color) }}
          title={`${channel.label}: ${channelDisplay(channel)}`}
          detail={<List.Item.Detail markdown={panel} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section title={channel.label}>
                <Action
                  title="Increase"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                  onAction={() => set(i, channel.value + channel.step)}
                />
                <Action
                  title="Decrease"
                  icon={Icon.Minus}
                  shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  onAction={() => set(i, channel.value - channel.step)}
                />
                <Action
                  title="Increase ×5"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
                  onAction={() => set(i, channel.value + channel.step * 5)}
                />
                <Action
                  title="Decrease ×5"
                  icon={Icon.Minus}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
                  onAction={() => set(i, channel.value - channel.step * 5)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard title={`Copy ${MODEL_LABEL[model]}`} content={modelString(color, model)} />
                <Action.CopyToClipboard
                  title="Copy Hex"
                  icon={Icon.Hashtag}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                  content={toHex(color, color.a < 1)}
                />
              </ActionPanel.Section>
              <Action
                icon={Icon.Swatch}
                title="Back to Overview"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={onDone}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
