import { useState, useEffect, useRef } from "react";
import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Cache,
  LocalStorage,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { createFontPreviewSVG } from "./fontPreview";
import { sortWeights } from "./utils";

const execAsync = promisify(exec);
const cache = new Cache();
const CACHE_KEY = "installedFonts";
const PINNED_FONTS_KEY = "pinnedFonts";

interface Font {
  name: string;
  path: string;
  isSystem: boolean;
  styles: string[];
  isPinned?: boolean;
  postScriptNames: string[];
}

interface Preferences {
  previewText: string;
}

interface FontFile {
  path: string;
  typefaces: Typeface[];
}

interface Typeface {
  family: string;
  style: string;
  _name: string;
}

async function getFonts(): Promise<Font[]> {
  const cachedFonts = cache.get(CACHE_KEY);
  if (cachedFonts) {
    return JSON.parse(cachedFonts);
  }

  try {
    const { stdout } = await execAsync("/usr/sbin/system_profiler SPFontsDataType -json", {
      maxBuffer: 1024 * 1024 * 10, // 10 MB buffer
    });
    const fontData: FontFile[] = JSON.parse(stdout).SPFontsDataType;

    const fontMap = new Map<string, Font>();

    fontData.forEach((fontFile: FontFile) => {
      fontFile.typefaces.forEach((typeface: Typeface) => {
        const fontName = typeface.family;
        if (!fontMap.has(fontName)) {
          fontMap.set(fontName, {
            name: fontName,
            path: fontFile.path,
            isSystem: fontFile.path.startsWith("/System"),
            styles: [typeface.style],
            postScriptNames: [typeface._name],
          });
        } else {
          const font = fontMap.get(fontName)!;
          if (!font.styles.includes(typeface.style)) {
            font.styles.push(typeface.style);
          }
          if (!font.postScriptNames.includes(typeface._name)) {
            font.postScriptNames.push(typeface._name);
          }
        }
      });
    });

    const fonts = Array.from(fontMap.values())
      .filter((font) => !font.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort fonts alphabetically

    cache.set(CACHE_KEY, JSON.stringify(fonts));
    return fonts;
  } catch (error) {
    console.error("Error fetching fonts:", error);
    showToast({ title: "Error fetching fonts", style: Toast.Style.Failure });
    return [];
  }
}

// Main command component
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showSystemFonts, setShowSystemFonts] = useState(true);
  const [pinnedFonts, setPinnedFonts] = useState<string[]>([]);
  const preferences = getPreferenceValues<Preferences>();
  const abortable = useRef<AbortController>();

  const {
    isLoading,
    data: fonts,
    revalidate,
  } = useCachedPromise(
    async () => {
      const allFonts = await getFonts();
      const storedPinnedFonts = await LocalStorage.getItem<string>(PINNED_FONTS_KEY);
      const pinnedFontNames = storedPinnedFonts ? JSON.parse(storedPinnedFonts) : [];
      setPinnedFonts(pinnedFontNames);
      return allFonts.map((font) => ({ ...font, isPinned: pinnedFontNames.includes(font.name) }));
    },
    [],
    {
      abortable,
      keepPreviousData: true,
    },
  );

  // Filter fonts based on search and system font preference
  const filteredFonts =
    fonts?.filter((font) => {
      const matchesSearch = font.name.toLowerCase().includes(searchText.toLowerCase());
      return showSystemFonts ? matchesSearch : matchesSearch && !font.isSystem;
    }) || [];

  // Separate pinned and unpinned fonts
  const pinnedFilteredFonts = filteredFonts.filter((font) => font.isPinned);
  const unpinnedFilteredFonts = filteredFonts.filter((font) => !font.isPinned);

  const togglePinFont = async (font: Font) => {
    const updatedPinnedFonts = font.isPinned
      ? pinnedFonts.filter((name) => name !== font.name)
      : [...pinnedFonts, font.name];

    await LocalStorage.setItem(PINNED_FONTS_KEY, JSON.stringify(updatedPinnedFonts));
    setPinnedFonts(updatedPinnedFonts);
    revalidate();
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search fonts..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter System Fonts"
          storeValue={true}
          onChange={(newValue) => setShowSystemFonts(newValue === "all")}
        >
          <List.Dropdown.Item title="All Fonts" value="all" />
          <List.Dropdown.Item title="User Fonts Only" value="user" />
        </List.Dropdown>
      }
    >
      {pinnedFilteredFonts.length > 0 && (
        <List.Section title="Pinned">
          {pinnedFilteredFonts.map((font) => (
            <FontListItem
              key={`${font.name}-${font.path}-pinned`}
              font={font}
              previewText={preferences.previewText}
              onReload={revalidate}
              onTogglePin={() => togglePinFont(font)}
            />
          ))}
        </List.Section>
      )}
      <List.Section title={pinnedFilteredFonts.length > 0 ? "Other" : "All"}>
        {unpinnedFilteredFonts.map((font) => (
          <FontListItem
            key={`${font.name}-${font.path}`}
            font={font}
            previewText={preferences.previewText}
            onReload={revalidate}
            onTogglePin={() => togglePinFont(font)}
          />
        ))}
      </List.Section>
    </List>
  );
}

// Font list item component
function FontListItem({
  font,
  previewText,
  onReload,
  onTogglePin,
}: {
  font: Font;
  previewText: string;
  onReload: () => void;
  onTogglePin: () => void;
}) {
  const [previewSVG, setPreviewSVG] = useState<string | null>(null);

  useEffect(() => {
    setPreviewSVG(createFontPreviewSVG(font.name, previewText));
  }, [font, previewText]);

  return (
    <List.Item
      icon={font.isPinned ? Icon.Tack : font.isSystem ? Icon.Text : Icon.QuotationMarks}
      title={font.name}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Font Name"
            content={font.name}
            onCopy={() => showToast({ title: "Font name copied", style: Toast.Style.Success })}
          />
          <Action.ShowInFinder path={font.path} />
          <Action.Push
            title="Show PostScript Names"
            icon={Icon.List}
            target={<PostScriptNamesList fontName={font.name} postScriptNames={font.postScriptNames || []} />}
            shortcut={Keyboard.Shortcut.Common.New}
          />
          <Action
            title={font.isPinned ? "Unpin Font" : "Pin Font"}
            icon={font.isPinned ? Icon.TackDisabled : Icon.Tack}
            onAction={onTogglePin}
            shortcut={Keyboard.Shortcut.Common.Pin}
          />
          <ActionPanel.Section>
            <Action
              title="Reload Font List"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                cache.remove(CACHE_KEY);
                onReload();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={previewSVG ? `${previewSVG}` : "Generating preview..."}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text={font.isSystem ? "System Font" : "User Font"} />
              <List.Item.Detail.Metadata.Label title="Path" text={font.path} />
              <List.Item.Detail.Metadata.Label title="Styles" text={sortWeights(font.styles).join(", ")} />
              <List.Item.Detail.Metadata.Label title="Pinned" text={font.isPinned ? "Yes" : "No"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

interface PostScriptNamesListProps {
  fontName: string;
  postScriptNames: string[];
}

function PostScriptNamesList({ fontName, postScriptNames }: PostScriptNamesListProps) {
  const [searchText, setSearchText] = useState("");

  const filteredNames = postScriptNames.filter((name) => name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      navigationTitle={`PostScript Names for ${fontName}`}
      searchBarPlaceholder="Search PostScript names..."
      onSearchTextChange={setSearchText}
      isShowingDetail={false}
    >
      {filteredNames.length === 0 && postScriptNames.length > 0 && searchText.length > 0 ? (
        <List.EmptyView title="No matching PostScript names" description="Try a different search term." />
      ) : filteredNames.length === 0 && postScriptNames.length === 0 ? (
        <List.EmptyView title="No PostScript Names" description={`No PostScript names found for ${fontName}.`} />
      ) : (
        filteredNames.map((name) => (
          <List.Item
            key={name}
            title={name}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy PostScript Name"
                  content={name}
                  onCopy={() => showToast({ title: "PostScript name copied", style: Toast.Style.Success })}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
