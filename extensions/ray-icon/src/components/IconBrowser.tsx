import { Action, ActionPanel, Alert, confirmAlert, Grid, Icon, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ICON_NAMES, iconTitle, searchIcons } from "../lib/icons";
import { applyTemplate, Collection, filterLibrary, iconIdentity, removeLibraryItem, SavedIcon } from "../lib/library";
import { previewFile } from "../lib/render";
import { applyPreset, DEFAULT_SETTINGS, describePreset, IconSettings, PRESETS } from "../lib/settings";
import { ExportActions } from "./IconActions";
import { IconPreview } from "./IconPreview";
import { LibraryActions, libraryAction, TemplateForm } from "./LibraryActions";
import { useLibrary } from "./useLibrary";

export type BrowserMode = "all" | Collection;
const MODES: { id: BrowserMode; title: string; icon: Icon }[] = [
  { id: "all", title: "All Icons", icon: Icon.AppWindowGrid3x3 },
  { id: "history", title: "History", icon: Icon.Clock },
  { id: "favorites", title: "Favorites", icon: Icon.Star },
  { id: "templates", title: "Templates", icon: Icon.Document },
];
const EMPTY_TEXT: Record<Collection, string> = {
  history: "Export or copy an icon, generate one with AI, or use Save to History to keep a draft.",
  favorites: "Use Add to Favorites on any icon to keep its exact design here.",
  templates: "Use Save as Template on any icon to reuse its style.",
};

export function IconBrowser({ initialMode = "all" }: { initialMode?: BrowserMode }) {
  const [mode, setMode] = useState<BrowserMode>(initialMode);
  const [presetIndex, setPresetIndex] = useCachedState("preset-index", 0);
  const [searchText, setSearchText] = useState("");
  const [template, setTemplate] = useState<SavedIcon>();
  const { library, error, isLoading, refresh } = useLibrary();
  const favorites = useMemo(() => new Set(library.favorites.map((item) => item.id)), [library.favorites]);
  const base = useMemo(() => applyPreset(DEFAULT_SETTINGS, presetIndex), [presetIndex]);
  const names = useMemo(() => (searchText ? searchIcons(searchText, 200) : ICON_NAMES), [searchText]);
  const saved = mode === "all" ? [] : filterLibrary(library[mode], searchText);
  const modeTitle = MODES.find((item) => item.id === mode)?.title ?? "All Icons";
  const switchMode = (next: BrowserMode) => {
    setMode(next);
    setSearchText("");
    refresh();
  };
  const selectPreset = (index: number) => {
    setTemplate(undefined);
    setPresetIndex(index);
  };

  function navigationActions() {
    return (
      <ActionPanel.Section title="Browse">
        {MODES.map((item, index) => (
          <Action
            key={item.id}
            title={`Show ${item.title}`}
            icon={item.icon}
            shortcut={{ modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent }}
            onAction={() => switchMode(item.id)}
          />
        ))}
        <Action
          title="Refresh Library"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
      </ActionPanel.Section>
    );
  }

  function presetActions() {
    if (mode !== "all") return null;
    return (
      <ActionPanel.Section title={template ? `Style: ${template.name}` : `Preset ${presetIndex}`}>
        <ActionPanel.Submenu
          title="Choose Preset"
          icon={Icon.Swatch}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        >
          {PRESETS.map((preset, index) => (
            <Action
              key={index}
              title={describePreset(preset)}
              icon={{ source: Icon.CircleFilled, tintColor: preset.backgroundStartColor }}
              onAction={() => selectPreset(index)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Next Preset"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "]" }}
          onAction={() => selectPreset((presetIndex + 1) % PRESETS.length)}
        />
        <Action
          title="Previous Preset"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
          onAction={() => selectPreset((presetIndex - 1 + PRESETS.length) % PRESETS.length)}
        />
        <Action
          title="Random Preset"
          icon={Icon.Shuffle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={() => selectPreset(Math.floor(Math.random() * PRESETS.length))}
        />
      </ActionPanel.Section>
    );
  }

  function actions(settings: IconSettings, entry?: SavedIcon) {
    return (
      <ActionPanel>
        {mode === "templates" && entry ? (
          <Action
            title="Use Template"
            icon={Icon.Brush}
            onAction={() => {
              setTemplate(entry);
              switchMode("all");
            }}
          />
        ) : null}
        <Action.Push
          title={entry ? "Edit Icon" : "Customize"}
          icon={Icon.Pencil}
          target={<IconPreview settings={settings} />}
        />
        <ExportActions settings={settings} />
        <LibraryActions settings={settings} isFavorite={favorites.has(iconIdentity(settings))} onChange={refresh} />
        {mode === "templates" && entry && !entry.builtIn ? (
          <ActionPanel.Section title="Template">
            <Action.Push
              title="Rename Template"
              icon={Icon.Pencil}
              target={<TemplateForm settings={settings} template={entry} />}
            />
            <Action
              title="Delete Template"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: `Delete “${entry.name}”?`,
                    message: "Exported files, history, and favorites will be kept.",
                    primaryAction: { title: "Delete Template", style: Alert.ActionStyle.Destructive },
                  })
                ) {
                  await libraryAction("Template Deleted", () => {
                    removeLibraryItem("templates", entry.id);
                    refresh();
                  });
                }
              }}
            />
          </ActionPanel.Section>
        ) : null}
        {mode === "history" && entry ? (
          <Action
            title="Remove from History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() =>
              libraryAction("Removed from History", () => {
                removeLibraryItem("history", entry.id);
                refresh();
              })
            }
          />
        ) : null}
        {presetActions()}
        {navigationActions()}
      </ActionPanel>
    );
  }

  const empty = mode === "all" ? names.length === 0 : saved.length === 0;
  return (
    <Grid
      navigationTitle={mode === "all" ? (template ? `Create Icon · ${template.name}` : "Create Icon") : modeTitle}
      columns={mode === "all" ? 6 : 5}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        mode === "all" ? `Search ${ICON_NAMES.length} icons…` : `Search ${modeTitle.toLowerCase()}…`
      }
      searchBarAccessory={
        <Grid.Dropdown tooltip="Browse Icons" value={mode} onChange={(value) => switchMode(value as BrowserMode)}>
          {MODES.map((item) => (
            <Grid.Dropdown.Item
              key={item.id}
              value={item.id}
              title={item.id === "all" ? item.title : `${item.title} (${library[item.id].length})`}
              icon={item.icon}
            />
          ))}
        </Grid.Dropdown>
      }
      actions={
        <ActionPanel>
          {navigationActions()}
          {presetActions()}
        </ActionPanel>
      }
    >
      {error && mode !== "all" ? (
        <Grid.EmptyView
          title="Could Not Load Library"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refresh} />
              {navigationActions()}
            </ActionPanel>
          }
        />
      ) : empty ? (
        <Grid.EmptyView
          title={searchText ? "No Matching Icons" : `No ${modeTitle} Yet`}
          description={
            searchText
              ? "Try a different name or keyword."
              : mode === "all"
                ? "Choose a different search."
                : EMPTY_TEXT[mode]
          }
          actions={
            <ActionPanel>
              <Action
                title={searchText ? "Clear Search" : "Browse All Icons"}
                icon={Icon.MagnifyingGlass}
                onAction={() => (searchText ? setSearchText("") : switchMode("all"))}
              />
              {navigationActions()}
            </ActionPanel>
          }
        />
      ) : (
        <Grid.Section
          title={mode === "all" ? (template ? `Style: ${template.name}` : `Preset ${presetIndex}`) : modeTitle}
          subtitle={
            library.issues.length
              ? `${library.issues.length} unreadable saved item(s); other items are available`
              : undefined
          }
        >
          {mode === "all"
            ? names.map((name) => {
                const target = { ...base, icon: name, customSvg: undefined, fileName: `${name}_icon` };
                const settings = template ? applyTemplate(template, target) : target;
                return (
                  <Grid.Item
                    key={name}
                    content={previewFile(settings)}
                    title={iconTitle(name)}
                    subtitle={favorites.has(iconIdentity(settings)) ? "★ Favorite" : undefined}
                    actions={actions(settings)}
                  />
                );
              })
            : saved.map((entry) => (
                <Grid.Item
                  key={entry.id}
                  content={previewFile(entry.settings)}
                  title={entry.name}
                  subtitle={
                    entry.builtIn
                      ? "Built-in Template"
                      : `${favorites.has(iconIdentity(entry.settings)) ? "★ " : ""}${entry.settings.customSvg ? "Custom SVG" : iconTitle(entry.settings.icon ?? "")}`
                  }
                  actions={actions(entry.settings, entry)}
                />
              ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
