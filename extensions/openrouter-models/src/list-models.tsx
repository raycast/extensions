import {
  List,
  ActionPanel,
  Action,
  openExtensionPreferences,
  Color,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useMemo, useState, memo } from "react";
import { useModels } from "./api";
import { ModelInfo, Preferences, SortMode, SORT_OPTIONS } from "./types";
import {
  groupByFuzzyDate,
  formatPrice,
  formatContextLength,
  sortModels,
  filterModels,
} from "./utils";

// Memoized component to prevent unnecessary re-renders
const ModelListItem = memo(
  ({ model, preferences }: { model: ModelInfo; preferences: Preferences }) => {
    const hasPricing = model.pricing.prompt > 0 || model.pricing.completion > 0;

    const accessories = useMemo(() => {
      const items = [];

      if (hasPricing) {
        items.push(
          {
            icon: Icon.ArrowUp,
            text: `${formatPrice(model.pricing.prompt)}/M`,
            tooltip: `${formatPrice(model.pricing.prompt)}/M input tokens`,
          },
          {
            icon: Icon.ArrowDown,
            text: `${formatPrice(model.pricing.completion)}/M`,
            tooltip: `${formatPrice(model.pricing.completion)}/M output tokens`,
          },
        );
      } else {
        items.push({
          text: "Free",
          icon: Icon.Stars,
        });
      }

      items.push({
        tag: {
          value: `${formatContextLength(model.context_length)}`,
          color: Color.SecondaryText,
        },
        tooltip: `Context Window Length: ${model.context_length.toLocaleString()} tokens`,
        icon: Icon.Coins,
      });

      return items;
    }, [model.pricing.prompt, model.pricing.completion, model.context_length]);

    // Truncate model ID if combined length exceeds maxLengthBeforeTruncation in order to make the list to always look good
    const maxLengthBeforeTruncation = 70;
    const combinedLength = model.name.length + model.id.length;
    let displayModelId = model.id;

    if (combinedLength > maxLengthBeforeTruncation) {
      // Ensure we show at least 10 characters of the ID
      const availableSpace = Math.max(
        10,
        maxLengthBeforeTruncation - model.name.length - 3,
      );
      displayModelId = `${model.id.substring(0, availableSpace)}...`;
    }

    const actionPanelItems = useMemo(() => {
      const actions = [
        <Action.CopyToClipboard
          key="copy"
          title={`Copy ${model.id}`}
          content={model.id}
        />,
        <Action.OpenInBrowser
          key="page"
          icon={Icon.Info}
          title="Open Model Page on OpenRouter"
          url={`https://openrouter.ai/${model.id}`}
        />,
      ];

      const preferredKey =
        preferences.defaultAction === "copy" ? "copy" : "page";
      return actions.sort((a) => (a.key === preferredKey ? -1 : 1));
    }, [model.id, preferences.defaultAction]);

    return (
      <List.Item
        title={{
          value: model.name,
          tooltip: model.name,
        }}
        subtitle={{
          value: displayModelId,
          tooltip: `Model ID: ${model.id}`,
        }}
        accessories={accessories}
        actions={<ActionPanel>{actionPanelItems}</ActionPanel>}
      />
    );
  },
);

export default function Command() {
  // Fetch and access preferences once for all items
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading, error } = useModels();
  const [sortMode, setSortMode] = useState<SortMode>(SORT_OPTIONS.NEWEST);
  const [searchText, setSearchText] = useState<string>("");

  const groupedModels = useMemo(() => {
    if (!data?.data) {
      return {};
    }

    // First filter models based on search text
    const filteredModels = filterModels(data.data, searchText);

    // Then sort the filtered models
    const sortedModels = sortModels(filteredModels, sortMode);

    // Only group by date for "newest" sort mode
    if (sortMode === SORT_OPTIONS.NEWEST) {
      return groupByFuzzyDate(sortedModels);
    }

    // For other sort modes, use a single group
    return { Models: sortedModels };
  }, [data, sortMode, searchText]);

  // Prioritize showing error message if there is an error, regardless of data state
  if (error) {
    return (
      <List.EmptyView
        title="Error loading models"
        description="Unable to connect to OpenRouter"
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="OpenRouter Models"
      searchBarPlaceholder="Search models..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Models"
          value={sortMode}
          onChange={(newValue) => setSortMode(newValue as SortMode)}
        >
          <List.Dropdown.Item
            key={SORT_OPTIONS.NEWEST}
            title="Sort by Newest"
            value={SORT_OPTIONS.NEWEST}
          />
          <List.Dropdown.Item
            key={SORT_OPTIONS.CONTEXT}
            title="Sort by Context Length"
            value={SORT_OPTIONS.CONTEXT}
          />
          <List.Dropdown.Item
            key={SORT_OPTIONS.PRICE}
            title="Sort by Price"
            value={SORT_OPTIONS.PRICE}
          />
        </List.Dropdown>
      }
      throttle
    >
      {Object.entries(groupedModels).map(([group, models]) => (
        <List.Section key={group} title={group}>
          {models.map((model) => (
            <ModelListItem
              key={model.id}
              model={model}
              preferences={preferences}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
