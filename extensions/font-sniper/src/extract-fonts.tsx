import {
  Action,
  ActionPanel,
  Form,
  List,
  showToast,
  Toast,
  Clipboard,
  open,
  Icon,
  Color,
  getPreferenceValues,
  BrowserExtension,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { join } from "path";
import { FontInfo, FontFormat } from "./types";
import { extractFonts, checkFontAccessibility } from "./utils/fontExtractor";
import { downloadFont, downloadFonts } from "./utils/downloader";
import { isValidUrl, getDomain } from "./utils/urlHelpers";

type ViewState = "form" | "loading" | "list";

interface FontWithSelection extends FontInfo {
  selected: boolean;
}

// Sort order: TTF first, OTF second, WOFF2 third, then others
function getFormatSortOrder(format: FontFormat): number {
  const order: Record<FontFormat, number> = {
    ttf: 0,
    otf: 1,
    woff2: 2,
    woff: 3,
    eot: 4,
    unknown: 5,
  };
  return order[format];
}

// Convert weight name/number to numeric value for sorting
function getWeightSortOrder(weight: string | undefined): number {
  if (!weight) return 400;
  const w = weight.toLowerCase();
  const weightMap: Record<string, number> = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    ultralight: 200,
    light: 300,
    regular: 400,
    normal: 400,
    medium: 500,
    semibold: 600,
    demibold: 600,
    bold: 700,
    extrabold: 800,
    ultrabold: 800,
    black: 900,
    heavy: 900,
  };
  // Check if it's a named weight
  if (weightMap[w]) return weightMap[w];
  // Try parsing as number
  const num = parseInt(w, 10);
  if (!isNaN(num)) return num;
  return 400;
}

function sortFontsByFormat(fonts: FontWithSelection[]): FontWithSelection[] {
  return [...fonts].sort((a, b) => {
    // First sort by format
    const formatDiff =
      getFormatSortOrder(a.format) - getFormatSortOrder(b.format);
    if (formatDiff !== 0) return formatDiff;
    // Then by family name
    const familyDiff = a.family.localeCompare(b.family);
    if (familyDiff !== 0) return familyDiff;
    // Then by weight (numeric)
    return getWeightSortOrder(a.weight) - getWeightSortOrder(b.weight);
  });
}

function filterFontsByPreferences(
  fonts: FontInfo[],
  prefs: Preferences,
): FontInfo[] {
  return fonts.filter((font) => {
    switch (font.format) {
      case "woff2":
        return prefs.showWoff2;
      case "woff":
        return prefs.showWoff;
      case "ttf":
        return prefs.showTtf;
      case "otf":
        return prefs.showOtf;
      case "eot":
        return prefs.showEot;
      default:
        return true;
    }
  });
}

export default function ExtractFonts() {
  const preferences = getPreferenceValues<Preferences>();
  const [viewState, setViewState] = useState<ViewState>("form");
  const [url, setUrl] = useState("");
  const [downloadFolder, setDownloadFolder] = useState<string[]>([
    join(homedir(), "Downloads"),
  ]);
  const [fonts, setFonts] = useState<FontWithSelection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  // Try to prefill URL from clipboard on mount
  useEffect(() => {
    let isMounted = true;

    async function prefillUrl() {
      try {
        // Try Browser Extension first (optional)
        if (BrowserExtension) {
          const tabs = await BrowserExtension.getTabs();
          const activeTab = tabs.find((tab) => tab.active);
          if (activeTab?.url && isValidUrl(activeTab.url)) {
            if (isMounted) setUrl(activeTab.url);
            return;
          }
        }
      } catch {
        // Browser Extension not available, fall through to clipboard
      }

      try {
        // Fallback to clipboard
        const clipboardText = await Clipboard.readText();
        if (clipboardText && isValidUrl(clipboardText)) {
          if (isMounted) setUrl(clipboardText);
        }
      } catch {
        // Ignore clipboard errors
      }
    }

    prefillUrl();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(values: {
    url: string;
    downloadFolder: string[];
  }) {
    const targetUrl = values.url.trim();

    if (!isValidUrl(targetUrl)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid HTTP or HTTPS URL",
      });
      return;
    }

    setViewState("loading");
    setIsLoading(true);
    setSourceUrl(targetUrl);
    setDownloadFolder(values.downloadFolder);

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Extracting fonts...",
        message: getDomain(targetUrl),
      });

      // Extract fonts from the page
      const extractedFonts = await extractFonts(targetUrl);

      // Filter by user preferences
      const filteredFonts = filterFontsByPreferences(
        extractedFonts,
        preferences,
      );

      if (filteredFonts.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No fonts found";
        toast.message =
          extractedFonts.length > 0
            ? "This page doesn't contain any fonts that match your preferences"
            : "This page doesn't contain any downloadable fonts";
        setViewState("form");
        setIsLoading(false);
        return;
      }

      // Check accessibility for each font
      toast.message = "Checking font accessibility...";
      const checkedFonts = await Promise.all(
        filteredFonts.map(checkFontAccessibility),
      );

      // Add selection state (all deselected by default)
      const fontsWithSelection: FontWithSelection[] = checkedFonts.map(
        (font) => ({
          ...font,
          selected: false,
        }),
      );

      // Sort by format (TTF first, OTF second, WOFF2 third)
      const sortedFonts = sortFontsByFormat(fontsWithSelection);

      setFonts(sortedFonts);
      setViewState("list");

      const accessibleCount = sortedFonts.filter((f) => f.accessible).length;
      toast.style = Toast.Style.Success;
      toast.title = `Found ${sortedFonts.length} fonts`;
      toast.message = `${accessibleCount} downloadable`;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setViewState("form");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSelection(index: number) {
    setFonts((prev) =>
      prev.map((font, i) =>
        i === index ? { ...font, selected: !font.selected } : font,
      ),
    );
  }

  function selectAll() {
    setFonts((prev) =>
      prev.map((font) => ({
        ...font,
        selected: font.accessible,
      })),
    );
  }

  function deselectAll() {
    setFonts((prev) =>
      prev.map((font) => ({
        ...font,
        selected: false,
      })),
    );
  }

  function getDestFolder(): string {
    return downloadFolder[0] || join(homedir(), "Downloads");
  }

  async function handleDownloadSelected() {
    const selectedFonts = fonts.filter((f) => f.selected && f.accessible);

    if (selectedFonts.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No fonts selected",
        message: "Please select at least one downloadable font",
      });
      return;
    }

    const destFolder = getDestFolder();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading fonts...",
      message: `0/${selectedFonts.length}`,
    });

    const results = await downloadFonts(
      selectedFonts,
      destFolder,
      (completed, total) => {
        toast.message = `${completed}/${total}`;
      },
      { convertWoff2ToTtf: preferences.convertWoff2ToTtf },
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    if (failed === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Downloaded ${successful} fonts`;
      toast.message = destFolder;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Downloaded ${successful} fonts, ${failed} failed`;
      toast.message =
        results.find((r) => !r.success)?.error || "Some downloads failed";
    }
  }

  async function handleDownloadSingle(font: FontInfo) {
    const destFolder = getDestFolder();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading...",
      message: font.family,
    });

    const result = await downloadFont(font, destFolder, {
      convertWoff2ToTtf: preferences.convertWoff2ToTtf,
    });

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded";
      toast.message = result.filePath;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = result.error;
    }
  }

  function formatSize(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFontDisplayName(font: FontInfo): string {
    const parts = [font.family];
    if (font.weight && font.weight !== "Regular") {
      parts.push(font.weight);
    }
    if (font.style) {
      parts.push(font.style.charAt(0).toUpperCase() + font.style.slice(1));
    }
    return parts.join(" ");
  }

  function goBack() {
    setViewState("form");
    setFonts([]);
  }

  const selectedCount = fonts.filter((f) => f.selected).length;
  const accessibleCount = fonts.filter((f) => f.accessible).length;

  // Form view
  if (viewState === "form" || viewState === "loading") {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Download Fonts"
              onSubmit={handleSubmit}
              icon={Icon.Download}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="url"
          title="Website URL"
          placeholder="https://example.com"
          value={url}
          onChange={setUrl}
          autoFocus
        />
        <Form.FilePicker
          id="downloadFolder"
          title="Download Folder"
          allowMultipleSelection={false}
          canChooseDirectories={true}
          canChooseFiles={false}
          value={downloadFolder}
          onChange={setDownloadFolder}
        />
      </Form>
    );
  }

  // List view
  return (
    <List
      navigationTitle={`Fonts from ${getDomain(sourceUrl)}`}
      searchBarPlaceholder="Filter fonts..."
    >
      <List.Section
        title={`Found ${fonts.length} fonts`}
        subtitle={`${selectedCount} selected · ${getDomain(sourceUrl)}`}
      >
        {fonts.map((font, index) => (
          <List.Item
            key={`${font.url}-${index}`}
            icon={
              font.accessible
                ? font.selected
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
                : { source: Icon.XMarkCircle, tintColor: Color.Red }
            }
            title={getFontDisplayName(font)}
            subtitle={font.format.toUpperCase()}
            accessories={[
              ...(font.size ? [{ text: formatSize(font.size) }] : []),
              ...(font.isDataUri
                ? [{ tag: { value: "Embedded", color: Color.Blue } }]
                : []),
              ...(!font.accessible
                ? [{ tag: { value: "Cannot Access", color: Color.Red } }]
                : []),
            ]}
            actions={
              <ActionPanel>
                {font.accessible && (
                  <>
                    <Action
                      title={font.selected ? "Deselect" : "Select"}
                      icon={font.selected ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggleSelection(index)}
                    />
                    <Action
                      title="Download This Font"
                      icon={Icon.Download}
                      onAction={() => handleDownloadSingle(font)}
                    />
                  </>
                )}
                <Action
                  title="Download Selected Fonts"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={handleDownloadSelected}
                />
                <Action
                  title={
                    selectedCount === accessibleCount
                      ? "Deselect All"
                      : "Select All"
                  }
                  icon={
                    selectedCount === accessibleCount
                      ? Icon.Circle
                      : Icon.CheckCircle
                  }
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                  onAction={
                    selectedCount === accessibleCount ? deselectAll : selectAll
                  }
                />
                <Action
                  title="Open Download Folder"
                  icon={Icon.Folder}
                  shortcut={Keyboard.Shortcut.Common.OpenWith}
                  onAction={() => open(getDestFolder())}
                />
                <Action
                  title="New Search"
                  icon={Icon.ArrowLeft}
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={goBack}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
