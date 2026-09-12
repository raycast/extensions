import { useCallback, useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Grid,
  Icon,
  LocalStorage,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { CreateBookmarkFolderForm } from "./components/create-bookmark-folder-form";
import {
  addIconToFolder as persistAddIconToFolder,
  addIconsToFolder,
  findIconFolder,
  isIconInFolder,
  loadBookmarkFolders,
  removeIconFromFolder as persistRemoveIconFromFolder,
} from "./lib/bookmarks";
import {
  COLOR_KEY,
  COLOR_OPTIONS,
  DEFAULT_FOLDER,
  GRID_SIZE_KEY,
  ICON_STYLE_GROUPS,
  PNG_EXPORT_SUPPORTED,
  PREVIEW_STYLE_KEY,
  QUICK_ACTION_KEY,
  RECENT_SEARCHES_KEY,
  getColorName,
  getFolderColor,
  getFolderIcon,
  isQuickActionPreferenceValue,
} from "./lib/constants";
import {
  DEFAULT_PREVIEW_STYLE,
  DEFAULT_SEARCH_PAGE_SIZE,
  HugeiconsApiError,
  buildHugeiconsWebsiteUrl,
  filterSearchMetasByStyle,
  getSearchStyleLabel,
  mergeSearchIcons,
  mergeSearchMetas,
  normalizeSearchStyleValue,
  normalizeSearchValue,
  type HugeiconsIconStyle,
  type SearchResultIcon,
  type SearchResultMeta,
  type SearchStyleValue,
} from "./lib/hugeicons-api";
import {
  getHugeiconsIconStyles,
  getHugeiconsSourceLabel,
  getHugeiconsSourceMode,
  hydrateHugeiconsMetas,
  searchHugeiconsMetas,
} from "./lib/hugeicons-source";
import { loadConfiguredHugeiconsApiKey } from "./lib/hugeicons-auth";
import { copyPng, downloadPng, downloadSvg } from "./lib/icon-export";
import { colorSvg, svgToDataUri, svgToJsx, svgToSvelte, svgToVue } from "./lib/icon-utils";
import type { BookmarkFolder, HugeIcon, QuickActionPreference } from "./lib/types";

interface SearchErrorState {
  title: string;
  message?: string;
  canOpenPreferences?: boolean;
}

const MAX_RECENT_SEARCHES = 8;
const DEFAULT_QUICK_ACTION: QuickActionPreference = "view-styles";

function getQuickActionPreference(preference: string | undefined): QuickActionPreference {
  return isQuickActionPreferenceValue(preference) ? preference : DEFAULT_QUICK_ACTION;
}

function getFileName(iconName: string, styleSuffix?: string): string {
  return styleSuffix ? `${iconName}-${styleSuffix}` : iconName;
}

function toStoredIcon(icon: HugeIcon): HugeIcon {
  return { name: icon.name, svg: icon.svg };
}

async function copyTextWithHUD(content: string, message: string): Promise<void> {
  await Clipboard.copy(content);
  await showHUD(message);
}

async function copySvgWithHUD(icon: HugeIcon, selectedColor: string, styleSuffix?: string): Promise<void> {
  const fileName = getFileName(icon.name, styleSuffix);
  await copyTextWithHUD(colorSvg(icon.svg, selectedColor), `Copied ${fileName} as SVG`);
}

async function copyJsxWithHUD(icon: HugeIcon, selectedColor: string, styleSuffix?: string): Promise<void> {
  const fileName = getFileName(icon.name, styleSuffix);
  await copyTextWithHUD(svgToJsx(icon.svg, fileName, selectedColor), `Copied ${fileName} as React JSX`);
}

async function downloadSvgForIcon(icon: HugeIcon, selectedColor: string, styleSuffix?: string): Promise<void> {
  const fileName = getFileName(icon.name, styleSuffix);
  await downloadSvg(colorSvg(icon.svg, selectedColor), fileName);
}

function buildTooltip(icon: HugeIcon & Partial<SearchResultMeta> & { resolvedStyle?: HugeiconsIconStyle }): string {
  const lines = [icon.name];
  const previewStyle =
    icon.resolvedStyle ?? (icon.styles && icon.styles.length === 1 ? icon.styles[0] : DEFAULT_PREVIEW_STYLE);

  if (icon.category) {
    lines.push(`Category: ${icon.category}`);
  }

  if (icon.tags && icon.tags.length > 0) {
    lines.push(`Tags: ${icon.tags.slice(0, 4).join(", ")}`);
  }

  lines.push(`Preview: ${getSearchStyleLabel(previewStyle)}`);

  return lines.join("\n");
}

function getRenderedStyleFingerprint(svg: string, selectedColor: string): string {
  return colorSvg(svg, selectedColor).replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}

async function loadRecentSearches(): Promise<string[]> {
  const storedValue = await LocalStorage.getItem<string>(RECENT_SEARCHES_KEY);

  if (!storedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

async function saveRecentSearches(recentSearches: string[]): Promise<void> {
  await LocalStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
}

async function pushRecentSearch(query: string): Promise<string[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return loadRecentSearches();
  }

  const recentSearches = await loadRecentSearches();
  const normalizedQuery = normalizeSearchValue(trimmedQuery);
  const nextRecentSearches = [
    trimmedQuery,
    ...recentSearches.filter((recentQuery) => normalizeSearchValue(recentQuery) !== normalizedQuery),
  ].slice(0, MAX_RECENT_SEARCHES);

  await saveRecentSearches(nextRecentSearches);

  return nextRecentSearches;
}

function BookmarkFolderActions({
  icon,
  bookmarkFolders,
  onAddToFolder,
  onRemoveFromFolder,
  isInFolder,
  onRefreshFolders,
}: {
  icon: HugeIcon;
  bookmarkFolders: BookmarkFolder[];
  onAddToFolder: (icon: HugeIcon, folderId: string) => void;
  onRemoveFromFolder: (iconName: string, folderId: string) => void;
  isInFolder: (iconName: string, folderId: string) => boolean;
  onRefreshFolders: () => void;
}) {
  return (
    <ActionPanel.Section
      title={bookmarkFolders.some((folder) => isInFolder(icon.name, folder.id)) ? "Move to..." : "Add to..."}
    >
      {bookmarkFolders.map((folder) => {
        const inFolder = isInFolder(icon.name, folder.id);

        return (
          <Action
            key={folder.id}
            title={inFolder ? `Remove from ${folder.name}` : folder.name}
            icon={{
              source: inFolder ? Icon.MinusCircle : getFolderIcon(folder.icon),
              tintColor: getFolderColor(folder.color),
            }}
            onAction={() => (inFolder ? onRemoveFromFolder(icon.name, folder.id) : onAddToFolder(icon, folder.id))}
          />
        );
      })}
      <Action.Push
        title="Create New Folder"
        icon={Icon.PlusCircle}
        target={<CreateBookmarkFolderForm initialIcon={icon} onFolderCreated={onRefreshFolders} />}
      />
    </ActionPanel.Section>
  );
}

function ColorActions({
  selectedColor,
  onColorChange,
}: {
  selectedColor: string;
  onColorChange: (color: string) => void;
}) {
  return (
    <ActionPanel.Section title="Icon Color">
      {COLOR_OPTIONS.map((color) => (
        <Action
          key={color.value}
          title={color.name}
          icon={{
            source: selectedColor === color.value ? Icon.CheckCircle : Icon.Circle,
            tintColor: color.raycastColor,
          }}
          onAction={() => onColorChange(color.value)}
        />
      ))}
    </ActionPanel.Section>
  );
}

function StylePreviewView({
  icon,
  styleName,
  selectedColor,
  onColorChange,
  bookmarkFolders,
  onAddToFolder,
  onRemoveFromFolder,
  isInFolder,
  onRefreshFolders,
}: {
  icon: HugeIcon;
  styleName: string;
  selectedColor: string;
  onColorChange: (color: string) => void;
  bookmarkFolders: BookmarkFolder[];
  onAddToFolder: (icon: HugeIcon, folderId: string) => void;
  onRemoveFromFolder: (iconName: string, folderId: string) => void;
  isInFolder: (iconName: string, folderId: string) => boolean;
  onRefreshFolders: () => void;
}) {
  const coloredSvg = colorSvg(icon.svg, selectedColor);
  const fileName = getFileName(icon.name, styleName);
  const currentColorName = getColorName(selectedColor);

  const markdown = `
# ${icon.name}
## Style: ${getSearchStyleLabel(styleName)}

![${icon.name}](${svgToDataUri(icon.svg, selectedColor)}?raycast-width=200&raycast-height=200)

**Color:** ${currentColorName}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${icon.name} • ${getSearchStyleLabel(styleName)}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy SVG"
              icon={Icon.Clipboard}
              onAction={() => copySvgWithHUD(icon, selectedColor, styleName)}
            />
            <Action.Paste title="Paste SVG" content={coloredSvg} />
            <Action
              title="Copy React (Jsx)"
              icon={Icon.Code}
              onAction={() => copyJsxWithHUD(icon, selectedColor, styleName)}
            />
            {PNG_EXPORT_SUPPORTED && (
              <Action
                title="Copy Png"
                icon={Icon.Image}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => copyPng(coloredSvg)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy as Component">
            <Action.CopyToClipboard
              title="Vue (Sfc)"
              icon={Icon.Code}
              content={svgToVue(icon.svg, fileName, selectedColor)}
            />
            <Action.CopyToClipboard
              title="Svelte"
              icon={Icon.Code}
              content={svgToSvelte(icon.svg, fileName, selectedColor)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Download">
            <Action
              title="Download SVG"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => downloadSvgForIcon(icon, selectedColor, styleName)}
            />
            {PNG_EXPORT_SUPPORTED && (
              <Action
                title="Download Png"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={() => downloadPng(coloredSvg, fileName)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Metadata">
            <Action.CopyToClipboard title="Copy Icon Name" icon={Icon.Text} content={icon.name} />
            <Action.OpenInBrowser
              title="Open on Hugeicons"
              icon={Icon.Globe}
              url={buildHugeiconsWebsiteUrl(icon.name)}
            />
          </ActionPanel.Section>
          <BookmarkFolderActions
            icon={icon}
            bookmarkFolders={bookmarkFolders}
            onAddToFolder={onAddToFolder}
            onRemoveFromFolder={onRemoveFromFolder}
            isInFolder={isInFolder}
            onRefreshFolders={onRefreshFolders}
          />
          <ColorActions selectedColor={selectedColor} onColorChange={onColorChange} />
        </ActionPanel>
      }
    />
  );
}

function IconDetailView({
  iconName,
  apiKey,
  selectedColor,
  onColorChange,
  bookmarkFolders,
  onAddToFolder,
  onRemoveFromFolder,
  isInFolder,
  onRefreshFolders,
}: {
  iconName: string;
  apiKey?: string;
  selectedColor: string;
  onColorChange: (color: string) => void;
  bookmarkFolders: BookmarkFolder[];
  onAddToFolder: (icon: HugeIcon, folderId: string) => void;
  onRemoveFromFolder: (iconName: string, folderId: string) => void;
  isInFolder: (iconName: string, folderId: string) => boolean;
  onRefreshFolders: () => void;
}) {
  const [styles, setStyles] = useState<Array<{ name: HugeiconsIconStyle; svg: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadStyles() {
      setIsLoading(true);

      try {
        setStyles(await getHugeiconsIconStyles({ iconName, apiKey, signal: abortController.signal }));
      } finally {
        setIsLoading(false);
      }
    }

    void loadStyles();

    return () => abortController.abort();
  }, [apiKey, iconName]);

  const currentColorName = getColorName(selectedColor);
  const availableStyles = styles.filter(
    (style): style is { name: HugeiconsIconStyle; svg: string } => style.svg !== null,
  );
  const uniqueStyles = Array.from(
    availableStyles.reduce((styleMap, style) => {
      const fingerprint = getRenderedStyleFingerprint(style.svg, selectedColor);
      const existingStyle = styleMap.get(fingerprint);

      if (existingStyle) {
        existingStyle.mergedStyleNames.push(style.name);
        return styleMap;
      }

      styleMap.set(fingerprint, {
        ...style,
        mergedStyleNames: [style.name],
      });

      return styleMap;
    }, new Map<string, { name: HugeiconsIconStyle; svg: string; mergedStyleNames: HugeiconsIconStyle[] }>()),
  ).map(([, style]) => style);
  const stylesByName = new Map(uniqueStyles.map((style) => [style.name, style]));

  const renderStyleItem = (style: {
    name: HugeiconsIconStyle;
    svg: string;
    mergedStyleNames: HugeiconsIconStyle[];
  }) => {
    const icon = { name: iconName, svg: style.svg };
    const duplicateCount = style.mergedStyleNames.length - 1;
    const duplicateLabels = style.mergedStyleNames.slice(1).map((styleName) => getSearchStyleLabel(styleName));

    return (
      <Grid.Item
        key={style.name}
        content={{
          source: svgToDataUri(style.svg, selectedColor),
          tooltip: `${iconName} • ${getSearchStyleLabel(style.name)}${duplicateLabels.length > 0 ? `\nMerged similar styles: ${duplicateLabels.join(", ")}` : ""}`,
        }}
        title={getSearchStyleLabel(style.name)}
        subtitle={duplicateCount > 0 ? `+${duplicateCount} similar` : undefined}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="View Large Preview"
                icon={Icon.Eye}
                target={
                  <StylePreviewView
                    icon={icon}
                    styleName={style.name}
                    selectedColor={selectedColor}
                    onColorChange={onColorChange}
                    bookmarkFolders={bookmarkFolders}
                    onAddToFolder={onAddToFolder}
                    onRemoveFromFolder={onRemoveFromFolder}
                    isInFolder={isInFolder}
                    onRefreshFolders={onRefreshFolders}
                  />
                }
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy">
              <Action
                title="Copy SVG"
                icon={Icon.Clipboard}
                onAction={() => copySvgWithHUD(icon, selectedColor, style.name)}
              />
              <Action.Paste title="Paste SVG" content={colorSvg(style.svg, selectedColor)} />
              <Action
                title="Copy React (Jsx)"
                icon={Icon.Code}
                onAction={() => copyJsxWithHUD(icon, selectedColor, style.name)}
              />
              {PNG_EXPORT_SUPPORTED && (
                <Action
                  title="Copy Png"
                  icon={Icon.Image}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => copyPng(colorSvg(style.svg, selectedColor))}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy as Component">
              <Action.CopyToClipboard
                title="Vue (Sfc)"
                icon={Icon.Code}
                content={svgToVue(style.svg, getFileName(iconName, style.name), selectedColor)}
              />
              <Action.CopyToClipboard
                title="Svelte"
                icon={Icon.Code}
                content={svgToSvelte(style.svg, getFileName(iconName, style.name), selectedColor)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Download">
              <Action
                title="Download SVG"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => downloadSvgForIcon(icon, selectedColor, style.name)}
              />
              {PNG_EXPORT_SUPPORTED && (
                <Action
                  title="Download Png"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onAction={() => downloadPng(colorSvg(style.svg, selectedColor), getFileName(iconName, style.name))}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="Metadata">
              <Action.CopyToClipboard title="Copy Icon Name" icon={Icon.Text} content={iconName} />
              <Action.OpenInBrowser
                title="Open on Hugeicons"
                icon={Icon.Globe}
                url={buildHugeiconsWebsiteUrl(iconName)}
              />
            </ActionPanel.Section>
            <BookmarkFolderActions
              icon={icon}
              bookmarkFolders={bookmarkFolders}
              onAddToFolder={onAddToFolder}
              onRemoveFromFolder={onRemoveFromFolder}
              isInFolder={isInFolder}
              onRefreshFolders={onRefreshFolders}
            />
            <ColorActions selectedColor={selectedColor} onColorChange={onColorChange} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      filtering={false}
      navigationTitle={`${iconName} • ${currentColorName} • ${uniqueStyles.length} unique style${uniqueStyles.length === 1 ? "" : "s"}`}
    >
      {isLoading && (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Loading styles..."
          description="Fetching available Hugeicons variants for this icon."
        />
      )}
      {!isLoading && uniqueStyles.length === 0 && (
        <Grid.EmptyView
          icon={Icon.Brush}
          title="No distinct style variants"
          description="This icon does not expose visually different Hugeicons styles."
        />
      )}
      {Object.entries(ICON_STYLE_GROUPS).map(([groupName, groupStyles]) => {
        const items = groupStyles
          .map((styleName) => stylesByName.get(styleName))
          .filter(
            (style): style is { name: HugeiconsIconStyle; svg: string; mergedStyleNames: HugeiconsIconStyle[] } =>
              style !== undefined,
          );

        if (items.length === 0) {
          return null;
        }

        return (
          <Grid.Section
            key={groupName}
            title={groupName}
            subtitle={`${items.length} unique style${items.length === 1 ? "" : "s"}`}
          >
            {items.map(renderStyleItem)}
          </Grid.Section>
        );
      })}
    </Grid>
  );
}

function SearchResultActions({
  icon,
  quickAction,
  selectedColor,
  onColorChange,
  apiKey,
  bookmarkFolders,
  onAddToFolder,
  onRemoveFromFolder,
  isInFolder,
  onRefreshFolders,
  selectedIcons,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onAddSelectedToFolder,
  onAddVisibleToFolder,
  visibleIcons,
}: {
  icon: SearchResultIcon | HugeIcon;
  quickAction: QuickActionPreference;
  selectedColor: string;
  onColorChange: (color: string) => void;
  apiKey?: string;
  bookmarkFolders: BookmarkFolder[];
  onAddToFolder: (icon: HugeIcon, folderId: string) => void;
  onRemoveFromFolder: (iconName: string, folderId: string) => void;
  isInFolder: (iconName: string, folderId: string) => boolean;
  onRefreshFolders: () => void;
  selectedIcons: Set<string>;
  onToggleSelection?: (iconName: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onAddSelectedToFolder?: (folderId: string) => void;
  onAddVisibleToFolder?: (folderId: string) => void;
  visibleIcons: HugeIcon[];
}) {
  const styleSuffix = "resolvedStyle" in icon ? icon.resolvedStyle : undefined;
  const coloredSvg = colorSvg(icon.svg, selectedColor);
  const fileName = getFileName(icon.name, styleSuffix);
  const selectedCount = selectedIcons.size;
  const isSelected = selectedIcons.has(icon.name);

  const viewAllStylesTarget = (
    <IconDetailView
      iconName={icon.name}
      apiKey={apiKey}
      selectedColor={selectedColor}
      onColorChange={onColorChange}
      bookmarkFolders={bookmarkFolders}
      onAddToFolder={onAddToFolder}
      onRemoveFromFolder={onRemoveFromFolder}
      isInFolder={isInFolder}
      onRefreshFolders={onRefreshFolders}
    />
  );

  const primaryAction =
    quickAction === "copy-svg" ? (
      <Action
        title="Copy SVG"
        icon={Icon.Clipboard}
        onAction={() => copySvgWithHUD(icon, selectedColor, styleSuffix)}
      />
    ) : quickAction === "copy-jsx" ? (
      <Action
        title="Copy React (Jsx)"
        icon={Icon.Code}
        onAction={() => copyJsxWithHUD(icon, selectedColor, styleSuffix)}
      />
    ) : quickAction === "download-svg" ? (
      <Action
        title="Download SVG"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={() => downloadSvgForIcon(icon, selectedColor, styleSuffix)}
      />
    ) : (
      <Action.Push title="View All Styles" icon={Icon.Eye} target={viewAllStylesTarget} />
    );

  return (
    <ActionPanel>
      <ActionPanel.Section>{primaryAction}</ActionPanel.Section>
      {quickAction !== "view-styles" && (
        <ActionPanel.Section title="Inspect">
          <Action.Push title="View All Styles" icon={Icon.Eye} target={viewAllStylesTarget} />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Copy">
        {quickAction !== "copy-svg" && (
          <Action
            title="Copy SVG"
            icon={Icon.Clipboard}
            onAction={() => copySvgWithHUD(icon, selectedColor, styleSuffix)}
          />
        )}
        <Action.Paste title="Paste SVG" content={coloredSvg} />
        {quickAction !== "copy-jsx" && (
          <Action
            title="Copy React (Jsx)"
            icon={Icon.Code}
            onAction={() => copyJsxWithHUD(icon, selectedColor, styleSuffix)}
          />
        )}
        {PNG_EXPORT_SUPPORTED && (
          <Action
            title="Copy Png"
            icon={Icon.Image}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => copyPng(coloredSvg)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy as Component">
        <Action.CopyToClipboard
          title="Vue (Sfc)"
          icon={Icon.Code}
          content={svgToVue(icon.svg, fileName, selectedColor)}
        />
        <Action.CopyToClipboard
          title="Svelte"
          icon={Icon.Code}
          content={svgToSvelte(icon.svg, fileName, selectedColor)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Download">
        {quickAction !== "download-svg" && (
          <Action
            title="Download SVG"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => downloadSvgForIcon(icon, selectedColor, styleSuffix)}
          />
        )}
        {PNG_EXPORT_SUPPORTED && (
          <Action
            title="Download Png"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={() => downloadPng(coloredSvg, fileName)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Metadata">
        <Action.CopyToClipboard title="Copy Icon Name" icon={Icon.Text} content={icon.name} />
        <Action.OpenInBrowser title="Open on Hugeicons" icon={Icon.Globe} url={buildHugeiconsWebsiteUrl(icon.name)} />
      </ActionPanel.Section>
      <BookmarkFolderActions
        icon={toStoredIcon(icon)}
        bookmarkFolders={bookmarkFolders}
        onAddToFolder={onAddToFolder}
        onRemoveFromFolder={onRemoveFromFolder}
        isInFolder={isInFolder}
        onRefreshFolders={onRefreshFolders}
      />
      {onToggleSelection && onSelectAll && onDeselectAll && (
        <ActionPanel.Section title="Bulk Select">
          <Action
            title={isSelected ? "Deselect Icon" : "Select Icon"}
            icon={isSelected ? Icon.Circle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => onToggleSelection(icon.name)}
          />
          {visibleIcons.length > 0 && (
            <Action
              title="Select All Visible"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={onSelectAll}
            />
          )}
          {selectedCount > 0 && (
            <Action
              title="Deselect All"
              icon={Icon.Circle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={onDeselectAll}
            />
          )}
        </ActionPanel.Section>
      )}
      {onAddSelectedToFolder && selectedCount > 0 && (
        <ActionPanel.Section title={`Add ${selectedCount} Selected to...`}>
          {bookmarkFolders.map((folder) => (
            <Action
              key={`selected-${folder.id}`}
              title={folder.name}
              icon={{
                source: getFolderIcon(folder.icon),
                tintColor: getFolderColor(folder.color),
              }}
              onAction={() => onAddSelectedToFolder(folder.id)}
            />
          ))}
          <Action.Push
            title="Create New Folder"
            icon={Icon.PlusCircle}
            target={
              <CreateBookmarkFolderForm
                initialIcons={visibleIcons
                  .filter((visibleIcon) => selectedIcons.has(visibleIcon.name))
                  .map(toStoredIcon)}
                onFolderCreated={onRefreshFolders}
              />
            }
          />
        </ActionPanel.Section>
      )}
      {onAddVisibleToFolder && visibleIcons.length > 0 && (
        <ActionPanel.Section title={`Add ${visibleIcons.length} Visible to...`}>
          {bookmarkFolders.map((folder) => (
            <Action
              key={`visible-${folder.id}`}
              title={folder.name}
              icon={{
                source: getFolderIcon(folder.icon),
                tintColor: getFolderColor(folder.color),
              }}
              onAction={() => onAddVisibleToFolder(folder.id)}
            />
          ))}
          <Action.Push
            title="Create New Folder"
            icon={Icon.PlusCircle}
            target={
              <CreateBookmarkFolderForm
                initialIcons={visibleIcons.map(toStoredIcon)}
                onFolderCreated={onRefreshFolders}
              />
            }
          />
        </ActionPanel.Section>
      )}
      <ColorActions selectedColor={selectedColor} onColorChange={onColorChange} />
    </ActionPanel>
  );
}

export default function Command() {
  const { apiKey: preferenceApiKey, gridSize, defaultColor, quickAction } = getPreferenceValues<Preferences>();

  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchedText, setSearchedText] = useState("");
  const [iconMetas, setIconMetas] = useState<SearchResultMeta[]>([]);
  const [icons, setIcons] = useState<SearchResultIcon[]>([]);
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([DEFAULT_FOLDER]);
  const [selectedColor, setSelectedColor] = useState<string>(defaultColor || "auto");
  const [selectedPreviewStyle, setSelectedPreviewStyle] = useState<SearchStyleValue>(DEFAULT_PREVIEW_STYLE);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [columns, setColumns] = useState(parseInt(gridSize) || 8);
  const [resolvedQuickAction, setResolvedQuickAction] = useState<QuickActionPreference>(
    getQuickActionPreference(quickAction),
  );
  const [resolvedApiKey, setResolvedApiKey] = useState<string | undefined>(preferenceApiKey);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const [searchError, setSearchError] = useState<SearchErrorState | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const iconMetasRef = useRef<SearchResultMeta[]>([]);
  const currentPageRef = useRef(0);
  const totalPagesRef = useRef(1);
  const sourceMode = getHugeiconsSourceMode(resolvedApiKey);
  const sourceLabel = getHugeiconsSourceLabel(resolvedApiKey);

  const loadData = useCallback(async () => {
    const [folders, storedColor, storedGridSize, storedPreviewStyle, storedRecentSearches, storedQuickAction, apiKey] =
      await Promise.all([
        loadBookmarkFolders(),
        LocalStorage.getItem<string>(COLOR_KEY),
        LocalStorage.getItem<string>(GRID_SIZE_KEY),
        LocalStorage.getItem<string>(PREVIEW_STYLE_KEY),
        loadRecentSearches(),
        LocalStorage.getItem<string>(QUICK_ACTION_KEY),
        loadConfiguredHugeiconsApiKey(),
      ]);

    setBookmarkFolders(folders);
    setSelectedColor(storedColor || defaultColor || "auto");
    setColumns(parseInt(storedGridSize || gridSize) || 8);
    setSelectedPreviewStyle(normalizeSearchStyleValue(storedPreviewStyle));
    setRecentSearches(storedRecentSearches);
    setResolvedQuickAction(getQuickActionPreference(storedQuickAction ?? quickAction));
    setResolvedApiKey(apiKey);
  }, [defaultColor, gridSize, quickAction]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    iconMetasRef.current = iconMetas;
  }, [iconMetas]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  const handleColorChange = useCallback(async (color: string) => {
    setSelectedColor(color);
    await LocalStorage.setItem(COLOR_KEY, color);
    await showToast({ style: Toast.Style.Success, title: `Color: ${getColorName(color)}` });
  }, []);

  const handlePreviewStyleChange = useCallback(async (style: SearchStyleValue) => {
    setSelectedPreviewStyle(style);
    await LocalStorage.setItem(PREVIEW_STYLE_KEY, style);
  }, []);

  const addToFolder = useCallback(
    async (icon: HugeIcon, folderId: string) => {
      const result = await persistAddIconToFolder(toStoredIcon(icon), folderId);
      await loadData();

      if (result.added) {
        await showToast({ style: Toast.Style.Success, title: `Added to ${result.folder.name}` });
      } else {
        await showToast({ style: Toast.Style.Failure, title: `Already in ${result.folder.name}` });
      }
    },
    [loadData],
  );

  const removeFromFolder = useCallback(
    async (iconName: string, folderId: string) => {
      await persistRemoveIconFromFolder(iconName, folderId);
      await loadData();
      await showToast({ style: Toast.Style.Success, title: "Removed from folder" });
    },
    [loadData],
  );

  const isInFolder = useCallback(
    (iconName: string, folderId: string) => isIconInFolder(iconName, folderId, bookmarkFolders),
    [bookmarkFolders],
  );

  const getIconFolder = useCallback(
    (iconName: string): BookmarkFolder | undefined => findIconFolder(iconName, bookmarkFolders),
    [bookmarkFolders],
  );

  const toggleIconSelection = useCallback((iconName: string) => {
    setSelectedIcons((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(iconName)) {
        nextSelection.delete(iconName);
      } else {
        nextSelection.add(iconName);
      }

      return nextSelection;
    });
  }, []);

  const selectAllIcons = useCallback(() => {
    setSelectedIcons(new Set(icons.map((icon) => icon.name)));
  }, [icons]);

  const deselectAllIcons = useCallback(() => {
    setSelectedIcons(new Set());
  }, []);

  useEffect(() => {
    const visibleIconNames = new Set(icons.map((icon) => icon.name));
    setSelectedIcons(
      (currentSelection) => new Set([...currentSelection].filter((iconName) => visibleIconNames.has(iconName))),
    );
  }, [icons]);

  const addSelectedToFolder = useCallback(
    async (folderId: string) => {
      const iconsToAdd = icons.filter((icon) => selectedIcons.has(icon.name)).map(toStoredIcon);

      if (iconsToAdd.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No selected icons" });
        return;
      }

      const result = await addIconsToFolder(iconsToAdd, folderId);
      await loadData();

      if (result.addedCount > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Added ${result.addedCount} icon${result.addedCount === 1 ? "" : "s"} to ${result.folder.name}`,
        });
        setSelectedIcons(new Set());
        return;
      }

      await showToast({ style: Toast.Style.Failure, title: `All selected icons are already in ${result.folder.name}` });
    },
    [icons, loadData, selectedIcons],
  );

  const addVisibleToFolder = useCallback(
    async (folderId: string) => {
      const result = await addIconsToFolder(icons.map(toStoredIcon), folderId);
      await loadData();

      if (result.addedCount > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Added ${result.addedCount} icon${result.addedCount === 1 ? "" : "s"} to ${result.folder.name}`,
        });
        return;
      }

      await showToast({ style: Toast.Style.Failure, title: `Visible results are already in ${result.folder.name}` });
    },
    [icons, loadData],
  );

  const loadSearchPage = useCallback(
    async ({
      query,
      page,
      append,
      forceRefresh = false,
    }: {
      query: string;
      page: number;
      append: boolean;
      forceRefresh?: boolean;
    }) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        abortControllerRef.current?.abort();
        requestIdRef.current += 1;
        setSearchedText("");
        setIconMetas([]);
        setIcons([]);
        setCurrentPage(0);
        setTotalPages(1);
        setSearchError(undefined);
        setIsLoadingSearch(false);
        setIsLoadingMore(false);
        return;
      }

      if (!append) {
        abortControllerRef.current?.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingSearch(true);
        setSearchError(undefined);
      }

      try {
        const activeStyle = selectedPreviewStyle;
        const seenNames = new Set(append ? iconMetasRef.current.map((item) => item.name) : []);
        const collectedMetas: SearchResultMeta[] = [];
        const targetCount = DEFAULT_SEARCH_PAGE_SIZE;
        let nextPage = page;
        let lastFetchedPage = Math.max(page, 1);
        let resolvedTotalPages = 1;
        let receivedAnySearchItems = false;

        while (nextPage <= resolvedTotalPages || nextPage === page) {
          const pageResponse = await searchHugeiconsMetas({
            query: trimmedQuery,
            page: nextPage,
            apiKey: resolvedApiKey,
            signal: abortController.signal,
            forceRefresh,
          });

          resolvedTotalPages = Math.max(pageResponse.totalPages, pageResponse.page || nextPage);
          lastFetchedPage = pageResponse.page || nextPage;
          receivedAnySearchItems ||= pageResponse.items.length > 0;

          const matchingItems = filterSearchMetasByStyle(pageResponse.items, activeStyle).filter((item) => {
            if (seenNames.has(item.name)) {
              return false;
            }

            seenNames.add(item.name);
            return true;
          });

          collectedMetas.push(...matchingItems);

          if (
            activeStyle === DEFAULT_PREVIEW_STYLE ||
            collectedMetas.length >= targetCount ||
            lastFetchedPage >= resolvedTotalPages
          ) {
            break;
          }

          nextPage = lastFetchedPage + 1;
        }

        const nextMetas = append ? mergeSearchMetas(iconMetasRef.current, collectedMetas) : collectedMetas;
        const itemsToHydrate = append ? collectedMetas : nextMetas;
        const hydratedItems = await hydrateHugeiconsMetas({
          items: itemsToHydrate,
          apiKey: resolvedApiKey,
          signal: abortController.signal,
          previewStyle: activeStyle,
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        if (append) {
          setIconMetas(nextMetas);
          setIcons((currentIcons) => mergeSearchIcons(currentIcons, hydratedItems));
        } else {
          setIconMetas(nextMetas);
          setIcons(hydratedItems);
        }

        setSearchedText(trimmedQuery);
        setCurrentPage(lastFetchedPage);
        setTotalPages(Math.max(resolvedTotalPages, lastFetchedPage || 1));
        setSearchError(
          receivedAnySearchItems && hydratedItems.length === 0
            ? {
                title:
                  activeStyle === DEFAULT_PREVIEW_STYLE
                    ? "Search results loaded, but previews failed"
                    : "No results for this style",
                message:
                  activeStyle === DEFAULT_PREVIEW_STYLE
                    ? "Retry the search or switch styles."
                    : `Try another search term or switch from ${getSearchStyleLabel(activeStyle)} to another style.`,
              }
            : undefined,
        );

        if (!append && receivedAnySearchItems) {
          setRecentSearches(await pushRecentSearch(trimmedQuery));
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        if (requestIdRef.current !== requestId) {
          return;
        }

        setSearchedText(trimmedQuery);
        setCurrentPage(append ? currentPageRef.current : 1);
        setTotalPages(append ? totalPagesRef.current : 1);

        if (!append) {
          setIconMetas([]);
          setIcons([]);
        }

        if (error instanceof HugeiconsApiError) {
          setSearchError({
            title: error.status === 429 ? "Hugeicons rate limited the request" : "Hugeicons request failed",
            message: error.message,
            canOpenPreferences: error.canOpenPreferences,
          });
          return;
        }

        setSearchError({
          title: "Failed to search Hugeicons",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoadingSearch(false);
          setIsLoadingMore(false);
        }
      }
    },
    [resolvedApiKey, selectedPreviewStyle],
  );

  useEffect(() => {
    if (searchText.trim() && searchText.trim() !== searchedText.trim()) {
      setSelectedIcons(new Set());
    }

    void loadSearchPage({ query: searchText, page: 1, append: false });
  }, [loadSearchPage, searchText]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const retrySearch = useCallback(() => {
    void loadSearchPage({ query: searchText, page: 1, append: false, forceRefresh: true });
  }, [loadSearchPage, searchText]);

  const currentColorName = getColorName(selectedColor);
  const currentPreviewStyleName = getSearchStyleLabel(selectedPreviewStyle);
  const searchMatches = searchText.trim() === searchedText.trim();
  const isSearching = Boolean(searchText.trim()) && !searchMatches;
  const favoritesFolder = bookmarkFolders.find((folder) => folder.id === DEFAULT_FOLDER.id);
  const showFavorites = !searchText.trim() && favoritesFolder && favoritesFolder.icons.length > 0;
  const showSearchResults = searchMatches && searchedText.trim() && icons.length > 0;
  const showStartState = !searchText.trim() && (!favoritesFolder || favoritesFolder.icons.length === 0);
  const showNoResults =
    searchMatches && searchedText.trim() && iconMetas.length === 0 && !searchError && !isLoadingSearch;
  const hasMore = Boolean(searchedText.trim()) && searchMatches && currentPage < totalPages && !isLoadingMore;
  const isLockedFreeStyle =
    sourceMode === "free" &&
    selectedPreviewStyle !== DEFAULT_PREVIEW_STYLE &&
    selectedPreviewStyle !== "stroke-rounded";

  const renderEmptyViewActions = () => (
    <ActionPanel>
      {searchError?.canOpenPreferences && (
        <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
      )}
      <Action title="Retry Search" icon={Icon.ArrowClockwise} onAction={retrySearch} />
    </ActionPanel>
  );

  const renderIconItem = (icon: SearchResultIcon | HugeIcon, showBulkActions: boolean) => {
    const iconFolder = getIconFolder(icon.name);
    const isSelected = selectedIcons.has(icon.name);
    const accessory = isSelected
      ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green } }
      : iconFolder
        ? {
            icon: {
              source: getFolderIcon(iconFolder.icon),
              tintColor: getFolderColor(iconFolder.color),
            },
          }
        : undefined;

    return (
      <Grid.Item
        key={icon.name}
        content={{
          source: svgToDataUri(icon.svg, selectedColor),
          tooltip: buildTooltip(icon),
        }}
        title={icon.name}
        subtitle={"category" in icon ? icon.category || undefined : undefined}
        accessory={accessory}
        actions={
          <SearchResultActions
            icon={icon}
            quickAction={resolvedQuickAction}
            selectedColor={selectedColor}
            onColorChange={handleColorChange}
            apiKey={resolvedApiKey}
            bookmarkFolders={bookmarkFolders}
            onAddToFolder={addToFolder}
            onRemoveFromFolder={removeFromFolder}
            isInFolder={isInFolder}
            onRefreshFolders={loadData}
            selectedIcons={selectedIcons}
            onToggleSelection={showBulkActions ? toggleIconSelection : undefined}
            onSelectAll={showBulkActions ? selectAllIcons : undefined}
            onDeselectAll={showBulkActions ? deselectAllIcons : undefined}
            onAddSelectedToFolder={showBulkActions ? addSelectedToFolder : undefined}
            onAddVisibleToFolder={showBulkActions ? addVisibleToFolder : undefined}
            visibleIcons={showBulkActions ? icons.map(toStoredIcon) : [toStoredIcon(icon)]}
          />
        }
      />
    );
  };

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoadingSearch || isLoadingMore}
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        sourceMode === "free" ? "Search free Hugeicons by name..." : "Search Hugeicons by name, tag, or category..."
      }
      navigationTitle="Hugeicons UI"
      pagination={
        searchedText.trim()
          ? {
              hasMore,
              pageSize: DEFAULT_SEARCH_PAGE_SIZE,
              onLoadMore: () => {
                if (hasMore) {
                  void loadSearchPage({ query: searchedText, page: currentPage + 1, append: true });
                }
              },
            }
          : undefined
      }
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Search Style and Recent Searches"
          value={`style:${selectedPreviewStyle}`}
          onChange={(newValue) => {
            if (newValue.startsWith("style:")) {
              void handlePreviewStyleChange(normalizeSearchStyleValue(newValue.replace("style:", "")));
              return;
            }

            if (newValue.startsWith("recent:")) {
              setSearchText(decodeURIComponent(newValue.replace("recent:", "")));
            }
          }}
        >
          <Grid.Dropdown.Section title="All Styles">
            <Grid.Dropdown.Item title={getSearchStyleLabel(DEFAULT_PREVIEW_STYLE)} value="style:default" />
          </Grid.Dropdown.Section>
          {Object.entries(ICON_STYLE_GROUPS).map(([groupName, styles]) => (
            <Grid.Dropdown.Section key={groupName} title={groupName}>
              {styles.map((style) => (
                <Grid.Dropdown.Item key={style} title={getSearchStyleLabel(style)} value={`style:${style}`} />
              ))}
            </Grid.Dropdown.Section>
          ))}
          {recentSearches.length > 0 && (
            <Grid.Dropdown.Section title="Recent Searches">
              {recentSearches.map((recentQuery) => (
                <Grid.Dropdown.Item
                  key={recentQuery}
                  title={recentQuery}
                  value={`recent:${encodeURIComponent(recentQuery)}`}
                />
              ))}
            </Grid.Dropdown.Section>
          )}
        </Grid.Dropdown>
      }
    >
      {showStartState && (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Hugeicons"
          description={
            sourceMode === "free"
              ? "Type to search the free Hugeicons catalog. Add your Hugeicons key in Extension Settings to unlock Pro icons and all styles."
              : "Type to search, then use the style dropdown for Standard, Rounded, or Sharp variants."
          }
          actions={
            sourceMode === "free" ? (
              <ActionPanel>
                <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
      {isSearching && <Grid.EmptyView icon={Icon.MagnifyingGlass} title={`Searching for “${searchText.trim()}”...`} />}
      {searchError && searchMatches && searchedText.trim() && (
        <Grid.EmptyView
          icon={searchError.canOpenPreferences ? Icon.Key : Icon.ExclamationMark}
          title={searchError.title}
          description={searchError.message}
          actions={renderEmptyViewActions()}
        />
      )}
      {showNoResults && (
        <Grid.EmptyView
          icon={Icon.XMarkCircle}
          title={
            selectedPreviewStyle === DEFAULT_PREVIEW_STYLE
              ? "No icons found"
              : `No ${currentPreviewStyleName} icons found`
          }
          description={
            isLockedFreeStyle
              ? "This style is part of Hugeicons Pro. Add your key in Extension Settings, or switch back to All Styles or Stroke Rounded."
              : selectedPreviewStyle === DEFAULT_PREVIEW_STYLE
                ? "Try another term, or pick one of the recent searches from the dropdown."
                : "Try another term, or switch to a different style from the dropdown."
          }
          actions={
            <ActionPanel>
              <Action title="Retry Search" icon={Icon.ArrowClockwise} onAction={retrySearch} />
              {sourceMode === "free" && (
                <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
              )}
            </ActionPanel>
          }
        />
      )}
      {showFavorites && favoritesFolder && (
        <Grid.Section title="Favorites" subtitle={`${currentColorName} • ${sourceLabel}`}>
          {favoritesFolder.icons.map((icon) => renderIconItem(icon, false))}
        </Grid.Section>
      )}
      {showSearchResults && (
        <Grid.Section
          title="Search Results"
          subtitle={`${sourceLabel} • ${currentColorName} • ${currentPreviewStyleName}${selectedPreviewStyle === DEFAULT_PREVIEW_STYLE ? "" : " filter"} • ${icons.length} loaded${selectedIcons.size > 0 ? ` • ${selectedIcons.size} selected` : ""}${totalPages > 1 ? ` • Source page ${currentPage} of ${totalPages}` : ""}`}
        >
          {icons.map((icon) => renderIconItem(icon, true))}
        </Grid.Section>
      )}
    </Grid>
  );
}
