import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Color,
  Toast,
  environment,
  getPreferenceValues,
  Grid,
  Icon,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { buildSvgUrl, useFetchIcons } from "../hooks/useFetchIcons";
import { useIconFiltering } from "../hooks/useIconFiltering";
import { LoadingAnimation } from "./LoadingAnimation";
import { useAISearch } from "../hooks/useAISearch";
import { IconEntry, MaterialStyle } from "../types";

const STYLE_OPTIONS: { value: MaterialStyle; label: string }[] = [
  { value: "filled", label: "Filled" },
  { value: "outlined", label: "Outlined" },
  { value: "rounded", label: "Rounded" },
  { value: "sharp", label: "Sharp" },
  { value: "two-tone", label: "Two Tone" },
];

export function IconGrid() {
  const { primaryAction, pascalCaseName } = getPreferenceValues();
  const [style, setStyle] = useState<MaterialStyle>("filled");
  const [isChangingStyle, setIsChangingStyle] = useState(false);
  const { data: allIcons, isLoading: isLoadingIcons } = useFetchIcons();
  const [searchText, setSearchText] = useState("");
  const [manualAISearch, setManualAISearch] = useState(false);
  const svgCache = useRef(new Map<string, string>());

  // Cleanup cache on unmount and periodically to prevent memory leaks
  useEffect(() => {
    // Periodic cleanup every 5 minutes
    const cleanupInterval = setInterval(
      () => {
        if (svgCache.current.size > 300) {
          svgCache.current.clear();
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => {
      clearInterval(cleanupInterval);
      svgCache.current.clear();
    };
  }, []);

  // Handle style change with cleanup
  const handleStyleChange = (newStyle: string) => {
    if (newStyle === style) return;

    // Clear cache before changing style to free memory
    svgCache.current.clear();

    // Clear search to reduce items during transition
    setSearchText("");

    // Add loading state to give GC time to clean up
    setIsChangingStyle(true);

    // Use setTimeout to allow UI to update and GC to run
    setTimeout(() => {
      setStyle(newStyle as MaterialStyle);
      // Give extra time before showing icons
      setTimeout(() => {
        setIsChangingStyle(false);
      }, 50);
    }, 100);
  };

  // Filter icons that have the selected style
  const iconsForStyle = (allIcons ?? []).filter((icon) => icon.styles.includes(style));

  const { filteredIcons } = useIconFiltering(iconsForStyle, searchText);

  const { modelResponse, isAILoading, revalidateAI } = useAISearch(
    iconsForStyle.map((icon) => icon.name).join(", ") || "",
    searchText,
    filteredIcons.length,
    manualAISearch,
  );

  const { iconEntries: allIconEntries, isAIResultsSection } = useIconFiltering(
    iconsForStyle,
    searchText,
    modelResponse,
    manualAISearch,
    filteredIcons,
  );

  // Limit results to prevent memory issues - show max 200 icons when no search
  const iconEntries = searchText.length > 0 ? allIconEntries : allIconEntries.slice(0, 200);

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    setManualAISearch(false);
  };

  const tintColor = Color.PrimaryText;

  const getPreferredStyle = (icon: IconEntry): MaterialStyle => {
    // If icon has the selected style, use it
    if (icon.styles.includes(style)) {
      return style;
    }
    // Otherwise, use the first available style
    return icon.styles[0] ?? "filled";
  };

  const getPathForStyle = (icon: IconEntry) => {
    const chosenStyle = getPreferredStyle(icon);
    if (icon.rawName) {
      return buildSvgUrl({ name: icon.rawName, version: icon.version }, chosenStyle);
    }
    return icon.paths?.[chosenStyle] ?? "";
  };

  const getImportForStyle = (icon: IconEntry) => {
    const chosenStyle = getPreferredStyle(icon);
    return icon.importStatements[chosenStyle] ?? "";
  };

  const resolveSvg = async (icon: IconEntry) => {
    const path = getPathForStyle(icon);
    if (icon.svg) return icon.svg;

    // Check cache first
    const cached = svgCache.current.get(path);
    if (cached) return cached;

    // Limit cache size to prevent memory issues - aggressive limit
    if (svgCache.current.size > 200) {
      svgCache.current.clear();
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching SVG" });
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.status}`);
      }
      const content = await response.text();

      // Only cache if content is reasonable size (< 100KB)
      if (content.length < 100000) {
        svgCache.current.set(path, content);
      }

      return content;
    } catch (error) {
      console.error("Error fetching SVG:", error);
      throw error;
    } finally {
      await toast.hide();
    }
  };

  const handleCopySvg = async (icon: IconEntry) => {
    const content = await resolveSvg(icon);
    await Clipboard.copy(content);
    await showToast({ style: Toast.Style.Success, title: "SVG Copied" });
  };

  const handlePasteSvg = async (icon: IconEntry) => {
    const content = await resolveSvg(icon);
    await Clipboard.paste(content);
    await showToast({ style: Toast.Style.Success, title: "SVG Pasted" });
  };

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      isLoading={isLoadingIcons || isAILoading || isChangingStyle}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Search Material Design icons..."
      throttle
      searchBarAccessory={
        <Grid.Dropdown tooltip="Change Style" value={style} onChange={handleStyleChange}>
          {STYLE_OPTIONS.map((option) => (
            <Grid.Dropdown.Item key={option.value} title={option.label} value={option.value} />
          ))}
        </Grid.Dropdown>
      }
    >
      {isAILoading && (
        <Grid.Section title="AI Results">
          <LoadingAnimation />
        </Grid.Section>
      )}
      {!isAILoading && iconEntries.length > 0 && (
        <Grid.Section
          title={isAIResultsSection ? "AI Results" : "Results"}
          subtitle={
            searchText.length > 0
              ? `${iconEntries.length}`
              : `${iconEntries.length} of ${allIconEntries.length} (search to see more)`
          }
        >
          {iconEntries.map((icon) => (
            <Grid.Item
              key={icon.name}
              title={icon.name}
              content={{ source: getPathForStyle(icon), tintColor }}
              keywords={icon.keywords}
              actions={
                <ActionPanel>
                  {[
                    {
                      id: "copy-import",
                      component: (
                        <Action.CopyToClipboard
                          key="copy-import"
                          title="Copy Import"
                          content={getImportForStyle(icon)}
                        />
                      ),
                    },
                    {
                      id: "copy-name",
                      component: (
                        <Action.CopyToClipboard
                          key="copy-name"
                          title="Copy Name"
                          content={
                            pascalCaseName
                              ? icon.name
                                  .split("-")
                                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join("")
                              : icon.name
                          }
                          shortcut={{
                            modifiers: ["shift", "cmd"],
                            key: "enter",
                          }}
                        />
                      ),
                    },
                    {
                      id: "copy-svg",
                      component: (
                        <Action
                          key="copy-svg"
                          title="Copy Svg"
                          icon={Icon.Clipboard}
                          onAction={() => handleCopySvg(icon)}
                        />
                      ),
                    },
                    {
                      id: "paste-svg",
                      component: (
                        <Action
                          key="paste-svg"
                          title="Paste Svg"
                          icon={Icon.Clipboard}
                          onAction={() => handlePasteSvg(icon)}
                        />
                      ),
                    },
                    {
                      id: "open-in-browser",
                      component: (
                        <Action.OpenInBrowser
                          key="open-in-browser"
                          url={icon.docsUrl}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "o",
                          }}
                        />
                      ),
                    },
                  ]
                    .sort((a, b) => (a.id === primaryAction ? -1 : b.id === primaryAction ? 1 : 0))
                    .map((action) => action.component)}
                  <ActionPanel.Section>
                    {environment.canAccess(AI) && (
                      <Action
                        title="Search with AI"
                        icon={Icon.Stars}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={() => {
                          setManualAISearch(true);
                          revalidateAI();
                        }}
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
