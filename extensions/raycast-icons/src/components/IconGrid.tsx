import { Action, ActionPanel, AI, Color, environment, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useIconSearch } from "../hooks/useIconSearch";
import { formatColorName } from "../utils";
import { LoadingAnimation } from "./LoadingAnimation";

export function IconGrid() {
  const [colorName, setColorName] = useState<string>("PrimaryText");
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);

  const {
    searchText,
    setSearchText,
    manualAISearch,
    setManualAISearch,
    iconEntries,
    isAILoading,
    revalidateAI,
    filteredIcons,
  } = useIconSearch();

  const color = Color[colorName as keyof typeof Color];

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    setManualAISearch(false);
  };

  const handleSelectionChange = (id: string | null) => {
    if (id === null) {
      setSelectedIconName(null);
    } else {
      setSelectedIconName(id);
    }
  };

  const isAIResultsSection =
    environment.canAccess(AI) && searchText.length > 0 && (filteredIcons.length === 0 || manualAISearch);

  if (isAILoading && !toast) {
    showToast({
      style: Toast.Style.Animated,
      title: "Searching with AI…",
    }).then(setToast);
  } else if (!isAILoading && toast) {
    toast.hide();
    setToast(null);
  }

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      isLoading={isAILoading}
      navigationTitle={selectedIconName ? `Search Raycast Icons – ${selectedIconName}` : "Search Raycast Icons"}
      onSearchTextChange={handleSearchTextChange}
      onSelectionChange={handleSelectionChange}
      throttle
      searchBarAccessory={
        <Grid.Dropdown tooltip="Change Color" value={colorName} onChange={(newColorName) => setColorName(newColorName)}>
          {Object.entries(Color).map(([name, colorValue]) => (
            <Grid.Dropdown.Item
              key={name}
              title={formatColorName(name)}
              value={name}
              icon={{ source: Icon.Circle, tintColor: colorValue }}
            />
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
        <Grid.Section title={isAIResultsSection ? "AI Results" : "Results"} subtitle={`${iconEntries.length}`}>
          {iconEntries.map(([name, icon]) => (
            <Grid.Item
              key={name}
              content={{ tooltip: name, source: icon, tintColor: color }}
              id={name}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Icon" content={`Icon.${name}`} />
                  <Action.CopyToClipboard
                    title="Copy Colored Icon"
                    content={`{ source: Icon.${name}, tintColor: Color.${colorName}}`}
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
                    <Action.OpenInBrowser
                      icon={Icon.Brush}
                      title="Create Extension Icon"
                      url={`https://icon.ray.so/?icon=${icon.replace("-16", "")}`}
                    />
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
