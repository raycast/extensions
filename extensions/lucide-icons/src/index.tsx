import { Action, ActionPanel, AI, Color, environment, Grid, Icon } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { useAISearch } from "./hooks/useAISearch";
import { useFetchIcons } from "./hooks/useFetchIcons";
import { useIconFiltering } from "./hooks/useIconFiltering";
import { toPascalCase } from "./utils";

export default function Command() {
  const { data: allIcons, isLoading: isLoadingIcons } = useFetchIcons();
  const [color, setColor] = useCachedState<Color>("color", Color.PrimaryText);
  const [columns, setColumns] = useCachedState<number>("size", 8);
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

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoadingIcons || isAILoading}
      onSearchTextChange={handleSearchTextChange}
      throttle
    >
      {!isAILoading && iconEntries.length > 0 && (
        <Grid.Section title={isAIResultsSection ? "AI Results" : "Results"} subtitle={`${iconEntries.length}`}>
          {iconEntries.map((icon) => (
            <Grid.Item
              key={icon.name}
              content={{ source: icon.path, tintColor: color }}
              title={icon.name}
              keywords={icon.keywords}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={icon.path} />
                  <Action.CopyToClipboard
                    shortcut={{
                      modifiers: ["cmd"],
                      key: "n",
                    }}
                    content={icon.name}
                    title="Copy Name to Clipboard"
                  />
                  <Action.CopyToClipboard
                    shortcut={{
                      modifiers: ["cmd"],
                      key: "s",
                    }}
                    content={icon.content}
                    title="Copy SVG to Clipboard"
                  />
                  <Action.CopyToClipboard
                    shortcut={{
                      modifiers: ["cmd", "shift"],
                      key: "r",
                    }}
                    content={`<${toPascalCase(icon.name)} />`}
                    title="Copy Component to Clipboard"
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
                  <ActionPanel.Section title="Preferences">
                    <ActionPanel.Submenu title="Change Size…" icon={Icon.MagnifyingGlass}>
                      {[4, 6, 8].map((cols) => (
                        <Action key={cols} title={cols.toString()} onAction={() => setColumns(cols)} />
                      ))}
                    </ActionPanel.Submenu>
                    <ActionPanel.Submenu title="Change Color…" icon={Icon.EyeDropper}>
                      {Object.entries(Color).map(([key, color]) => (
                        <Action
                          key={color.toString()}
                          title={key}
                          icon={{ source: Icon.Circle, tintColor: color }}
                          onAction={() => setColor(color as Color)}
                        />
                      ))}
                    </ActionPanel.Submenu>
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
