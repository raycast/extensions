import { useState, useEffect } from "react";
import { ActionPanel, List, Action, Icon, showToast, Toast, getPreferenceValues, Cache } from "@raycast/api";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { createFontPreviewSVG } from "./fontPreview";

const execAsync = promisify(exec);
const cache = new Cache();
const CACHE_KEY = "installedFonts";

interface Font {
  name: string;
  path: string;
  isSystem: boolean;
  styles: string[];
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
          });
        } else {
          const font = fontMap.get(fontName)!;
          if (!font.styles.includes(typeface.style)) {
            font.styles.push(typeface.style);
          }
        }
      });
    });

    const fonts = Array.from(fontMap.values()).filter((font) => !font.name.startsWith("."));

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
  const [fonts, setFonts] = useState<Font[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSystemFonts, setShowSystemFonts] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  // Load fonts function
  const loadFonts = async (forceReload: boolean = false) => {
    setIsLoading(true);
    try {
      const loadedFonts = await getFonts();
      setFonts(loadedFonts);
      if (forceReload) {
        showToast({ title: "Font list reloaded", style: Toast.Style.Success });
      }
    } catch (error) {
      console.error("Error loading fonts:", error);
      showToast({ title: "Error reloading font list", style: Toast.Style.Failure });
    } finally {
      setIsLoading(false);
    }
  };

  // Load fonts on component mount
  useEffect(() => {
    loadFonts();
  }, []);

  // Filter fonts based on search and system font preference
  const filteredFonts = fonts.filter((font) => {
    const matchesSearch = font.name.toLowerCase().includes(searchText.toLowerCase());
    return showSystemFonts ? matchesSearch : matchesSearch && !font.isSystem;
  });

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
      {filteredFonts.map((font) => (
        <FontListItem
          key={font.path}
          font={font}
          previewText={preferences.previewText}
          onReload={() => loadFonts(true)}
        />
      ))}
    </List>
  );
}

// Font list item component
function FontListItem({
  font,
  previewText,
  onReload,
}: {
  font: Font;
  previewText: string;
  onReload: () => Promise<void>;
}) {
  const [previewSVG, setPreviewSVG] = useState<string | null>(null);

  // Generate font preview SVG
  useEffect(() => {
    setPreviewSVG(createFontPreviewSVG(font.name, previewText));
  }, [font, previewText]);

  return (
    <List.Item
      icon={font.isSystem ? Icon.Text : Icon.QuotationMarks}
      title={font.name}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Font Name"
            content={font.name}
            onCopy={() => showToast({ title: "Font name copied", style: Toast.Style.Success })}
          />
          <Action.ShowInFinder path={font.path} />
          <ActionPanel.Section>
            <Action
              title="Reload Font List"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                cache.remove(CACHE_KEY);
                await onReload();
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
              <List.Item.Detail.Metadata.Label title="Styles" text={font.styles.join(", ")} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
