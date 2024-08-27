import { Action, ActionPanel, AI, Color, environment, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useAI, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";

export default function Command() {
  const [colorName, setColorName] = useState<string>("PrimaryText");
  const [searchText, setSearchText] = useState("");
  const [manualAISearch, setManualAISearch] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const formatColorName = (name: string): string => {
    return name
      .split(/(?=[A-Z])/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const color = Color[colorName as keyof typeof Color];

  const { data: allIconNames } = useCachedPromise(async () => Object.keys(Icon).join(", "), [], { initialData: "" });

  const { data: filteredIcons } = useCachedPromise(
    async (text: string) => {
      if (text.length === 0) return Object.entries(Icon);
      const lowercaseText = text.toLowerCase();
      return Object.entries(Icon).filter(([name]) => name.toLowerCase().includes(lowercaseText));
    },
    [searchText],
    {
      initialData: Object.entries(Icon),
      keepPreviousData: true,
    },
  );

  const prompt = `Here is a list of all available icon names: ${allIconNames}\nReturn the icon names in the list, separated by commas and with no additional text, that best match the semantic meaning of the following description: ${searchText}\nYou should return at least one icon name.`;

  const {
    data: modelResponse,
    isLoading: isAILoading,
    revalidate: revalidateAI,
  } = useAI(prompt, {
    model: AI.Model["OpenAI_GPT4o-mini"],
    execute: environment.canAccess(AI) && searchText.length > 0 && (filteredIcons.length === 0 || manualAISearch),
    onError: (error) => {
      console.error("AI search error:", error);
    },
  });

  const parseModelResponse = (results: string | undefined): string[] => {
    if (!results) return [];
    return results
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && Object.prototype.hasOwnProperty.call(Icon, item));
  };

  const iconEntries = useMemo(() => {
    if (searchText.length === 0) return Object.entries(Icon);
    if (environment.canAccess(AI) && modelResponse && (filteredIcons.length === 0 || manualAISearch)) {
      return parseModelResponse(modelResponse).map((name) => [name, Icon[name as keyof typeof Icon]]);
    }
    return filteredIcons;
  }, [searchText, modelResponse, filteredIcons, manualAISearch]);

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    setManualAISearch(false);
  };

  const isAIResultsSection =
    environment.canAccess(AI) &&
    searchText.length > 0 &&
    modelResponse &&
    (filteredIcons.length === 0 || manualAISearch);

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
      onSearchTextChange={handleSearchTextChange}
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
      {!isAILoading && iconEntries.length > 0 && (
        <Grid.Section title={isAIResultsSection ? "AI Results" : "Results"} subtitle={`${iconEntries.length}`}>
          {iconEntries.map(([name, icon]) => (
            <Grid.Item
              key={name}
              title={name}
              content={{ source: icon, tintColor: color }}
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
