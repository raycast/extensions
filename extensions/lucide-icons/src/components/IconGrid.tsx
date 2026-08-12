import { Action, ActionPanel, AI, Color, environment, Grid, Icon, getPreferenceValues, Keyboard } from "@raycast/api";
import { memo, useCallback, useMemo, useState } from "react";
import { useAISearch } from "../hooks/useAISearch";
import { useFetchIcons } from "../hooks/useFetchIcons";
import { useIconFiltering } from "../hooks/useIconFiltering";
import { LucideIcon } from "../types";
import { toPascalCase } from "../utils";
import { LoadingAnimation } from "./LoadingAnimation";

function IconGridItems({
  iconEntries,
  isAILoading,
  isAIResultsSection,
  color,
  primaryAction,
  pascalCaseName,
  onSearchWithAI,
}: {
  iconEntries: LucideIcon[];
  isAILoading: boolean | undefined;
  isAIResultsSection: boolean | undefined;
  color: Color.ColorLike;
  primaryAction: string;
  pascalCaseName: boolean;
  onSearchWithAI: () => void;
}) {
  return (
    <>
      {isAILoading && (
        <Grid.Section title="AI Results">
          <LoadingAnimation />
        </Grid.Section>
      )}
      {!isAILoading && iconEntries.length > 0 && (
        <Grid.Section title={isAIResultsSection ? "AI Results" : "Results"} subtitle={`${iconEntries.length}`}>
          {iconEntries.map((icon) => (
            <Grid.Item
              key={icon.name}
              id={icon.name}
              title={icon.name}
              content={{ source: icon.path, tintColor: color }}
              keywords={icon.keywords}
              actions={
                <ActionPanel>
                  {[
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
                        />
                      ),
                    },
                    {
                      id: "copy-svg",
                      component: (
                        <Action.CopyToClipboard
                          key="copy-svg"
                          title="Copy SVG"
                          content={icon.content}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                      ),
                    },
                    {
                      id: "paste-svg",
                      component: (
                        <Action.Paste
                          key="paste-svg"
                          title="Paste SVG"
                          content={icon.content}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "v" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "v" },
                          }}
                        />
                      ),
                    },
                    {
                      id: "copy-component",
                      component: (
                        <Action.CopyToClipboard
                          key="copy-component"
                          title="Copy Component"
                          content={`<${toPascalCase(icon.name)} />`}
                          shortcut={Keyboard.Shortcut.Common.CopyName}
                        />
                      ),
                    },
                    {
                      id: "open-in-browser",
                      component: (
                        <Action.OpenInBrowser
                          key="open-in-browser"
                          url={icon.path}
                          shortcut={Keyboard.Shortcut.Common.Open}
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
                        shortcut={{ modifiers: [], key: "tab" }}
                        onAction={onSearchWithAI}
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
    </>
  );
}

const MemoizedIconGridItems = memo(IconGridItems);

export function IconGrid() {
  const { primaryAction, pascalCaseName } = getPreferenceValues();
  const { data: allIcons, isLoading: isLoadingIcons } = useFetchIcons();
  const [colorName, setColorName] = useState<string>("PrimaryText");
  const [searchText, setSearchText] = useState("");
  const [manualAISearch, setManualAISearch] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  const { filteredIcons } = useIconFiltering(allIcons, searchText);

  const allIconNames = useMemo(() => allIcons?.map((icon) => icon.name).join(", ") || "", [allIcons]);

  const { modelResponse, isAILoading, revalidateAI } = useAISearch(
    allIconNames,
    searchText,
    filteredIcons.length,
    manualAISearch,
  );

  const { iconEntries, isAIResultsSection } = useIconFiltering(
    allIcons,
    searchText,
    modelResponse,
    manualAISearch,
    filteredIcons,
  );

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    setManualAISearch(false);
  };

  const color = Color[colorName as keyof typeof Color];

  const handleSearchWithAI = useCallback(() => {
    setManualAISearch(true);
    revalidateAI();
  }, [revalidateAI]);

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      isLoading={isLoadingIcons || isAILoading}
      navigationTitle={selectedIcon ? `Search Icons – ${selectedIcon}` : "Search Icons"}
      onSearchTextChange={handleSearchTextChange}
      onSelectionChange={setSelectedIcon}
      throttle
      searchBarAccessory={
        <Grid.Dropdown tooltip="Change Color" value={colorName} onChange={(newColorName) => setColorName(newColorName)}>
          {Object.entries(Color).map(([key, colorValue]) => (
            <Grid.Dropdown.Item
              key={key}
              title={key}
              value={key}
              icon={{ source: Icon.Circle, tintColor: colorValue }}
            />
          ))}
        </Grid.Dropdown>
      }
    >
      <MemoizedIconGridItems
        iconEntries={iconEntries}
        isAILoading={isAILoading}
        isAIResultsSection={isAIResultsSection}
        color={color}
        primaryAction={primaryAction}
        pascalCaseName={pascalCaseName}
        onSearchWithAI={handleSearchWithAI}
      />
    </Grid>
  );
}
