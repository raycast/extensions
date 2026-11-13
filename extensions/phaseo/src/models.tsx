import React, { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { clearAPICache, getModels } from "./api";
import { getOrganisationLogo } from "./logos";
import {
  formatDate,
  getModelURL,
  getOrganisationURL,
  getModelDisplayName,
  getModelOrganisationName,
  modelMatchesSearch,
} from "./utils";

type SortBy = "release_date" | "organisation" | "name";

export default function Command() {
  const [sortBy, setSortBy] = useState<SortBy>("release_date");
  const [searchText, setSearchText] = useState("");
  const {
    data: response,
    isLoading,
    revalidate,
  } = useCachedPromise(getModels, [250, 0], {
    keepPreviousData: true,
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load models",
        message: error.message,
      });
    },
  });
  const models = response?.models ?? [];
  const refresh = () => {
    clearAPICache();
    void revalidate();
  };

  // Filter models by search text
  const filteredModels = models.filter((model) =>
    modelMatchesSearch(model, searchText),
  );

  // Sort models
  const sortedModels = [...filteredModels].sort((a, b) => {
    switch (sortBy) {
      case "release_date": {
        const aDate = a.lifecycle.released_at
          ? new Date(a.lifecycle.released_at).getTime()
          : 0;
        const bDate = b.lifecycle.released_at
          ? new Date(b.lifecycle.released_at).getTime()
          : 0;
        if (aDate !== bDate) return bDate - aDate; // Newest first
        return getModelDisplayName(a).localeCompare(getModelDisplayName(b));
      }
      case "organisation": {
        const aOrg = getModelOrganisationName(a);
        const bOrg = getModelOrganisationName(b);
        if (aOrg !== bOrg) return aOrg.localeCompare(bOrg);
        return getModelDisplayName(a).localeCompare(getModelDisplayName(b));
      }
      case "name": {
        return getModelDisplayName(a).localeCompare(getModelDisplayName(b));
      }
      default:
        return 0;
    }
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search models by name, organisation, or endpoint..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          value={sortBy}
          onChange={(value) => setSortBy(value as SortBy)}
        >
          <List.Dropdown.Item
            title="Release Date (Newest First)"
            value="release_date"
          />
          <List.Dropdown.Item title="Organisation" value="organisation" />
          <List.Dropdown.Item title="Name" value="name" />
        </List.Dropdown>
      }
    >
      {sortedModels.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No models found"
          description="Try adjusting your search query"
        />
      )}
      {sortedModels.map((model) => (
        <List.Item
          key={model.id}
          title={model.name}
          subtitle={
            model.organization?.name ?? model.organization?.id ?? "Unknown"
          }
          icon={
            getOrganisationLogo(model.organization?.id ?? null) ?? {
              source: Icon.Building,
              tintColor: (model.organization?.color ??
                Color.SecondaryText) as Color.ColorLike,
            }
          }
          accessories={[{ text: formatDate(model.lifecycle.released_at) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Model Page"
                url={getModelURL(model.id)}
                icon={Icon.Globe}
              />
              <Action.CopyToClipboard
                title="Copy Model ID"
                content={model.id}
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              {model.organization?.id && (
                <Action.OpenInBrowser
                  title="Open Organisation Page"
                  url={getOrganisationURL(model.organization.id)}
                  icon={Icon.Building}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              )}
              <Action
                title="Refresh Models"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
