import { Action, ActionPanel, AI, Color, environment, Grid, Icon } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { useAISearch } from "./hooks/useAISearch";
import { useFetchIcons } from "./hooks/useFetchIcons";
import { useIconFiltering } from "./hooks/useIconFiltering";
import { toPascalCase } from "./utils";

export default function Command() {
  const { data: allIcons, isLoading: isLoadingIcons } = useFetchIcons();
  const [colorName, setColorName] = useCachedState<string>("colorName", "PrimaryText");
  const [searchText, setSearchText] = useState("");
  const [manualAISearch, setManualAISearch] = useState(false);

  const { data: allIconNames } = useCachedPromise(
    async () => {
      if (!allIcons) return "";
      return allIcons.map((icon) => icon.name).join(", ");
    },
    [],
    { initialData: "" },
  );

  const { filteredIcons } = useIconFiltering(allIcons, searchText);

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

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      isLoading={isLoadingIcons || isAILoading}
      onSearchTextChange={handleSearchTextChange}
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
      {!isAILoading && iconEntries.length > 0 && (
        <Grid.Section title={isAIResultsSection ? "AI Results" : "Results"} subtitle={`${iconEntries.length}`}>
          {iconEntries.map((icon) => (
            <Grid.Item
              key={icon.name}
              title={icon.name}
              content={{ source: icon.path, tintColor: color }}
              keywords={icon.keywords}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Name" content={icon.name} />
                  <Action.CopyToClipboard title="Copy SVG" content={icon.content} />
                  <Action.CopyToClipboard
                    title="Copy Component"
                    content={`<${toPascalCase(icon.name)} />`}
                    shortcut={{
                      modifiers: ["shift", "cmd"],
                      key: "enter",
                    }}
                  />
                  <Action.OpenInBrowser
                    url={icon.path}
                    shortcut={{
                      modifiers: ["cmd"],
                      key: "o",
                    }}
                  />
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
