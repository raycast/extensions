import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useDeferredValue, useMemo, useState } from "react";
import { ALL_CAPABILITIES, CAPABILITIES } from "../lib/constants";
import { filterByCapability, hasCapability } from "../lib/filters";
import { Capability, Model } from "../lib/types";
import { ModelListSection } from "./ModelListSection";

const PAGE_SIZE = 20;

interface ModelsListProps {
  models: Model[];
  isLoading?: boolean;
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  emptyDescription?: string;
}

export function ModelsList({
  models,
  isLoading = false,
  navigationTitle,
  searchBarPlaceholder = "Search models...",
  emptyDescription = "No models match your search",
}: ModelsListProps) {
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText);
  const [capability, setCapability] = useState<Capability | "all">("all");
  const [page, setPage] = useState(0);

  const filteredModels = useMemo(() => {
    let results = capability === "all" ? models : filterByCapability(models, capability);
    const terms = deferredSearchText.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length > 0) {
      results = results.filter((model) => {
        const capabilities = ALL_CAPABILITIES.filter((item) => hasCapability(model, item)).flatMap((item) => [
          item,
          CAPABILITIES[item].label,
        ]);
        const searchableText = [
          model.id,
          model.name,
          model.description,
          model.family,
          model.providerId,
          model.providerName,
          ...capabilities,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return terms.every((term) => searchableText.includes(term));
      });
    }

    return results;
  }, [models, capability, deferredSearchText]);

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const visibleModels = filteredModels.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <List
      filtering={false}
      isLoading={isLoading && models.length === 0}
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={(value) => {
        setSearchText(value);
        setPage(0);
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Capability"
          value={capability}
          onChange={(value) => {
            setCapability(value as Capability | "all");
            setPage(0);
          }}
        >
          <List.Dropdown.Item title="All Capabilities" value="all" icon={Icon.List} />
          <List.Dropdown.Section title="Capabilities">
            {ALL_CAPABILITIES.map((item) => (
              <List.Dropdown.Item
                key={item}
                title={CAPABILITIES[item].label}
                value={item}
                icon={CAPABILITIES[item].icon}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Models Found"
        description={
          capability === "all" ? emptyDescription : `No models found with ${CAPABILITIES[capability].label} capability`
        }
        icon={Icon.MagnifyingGlass}
      />
      <ModelListSection
        models={visibleModels}
        title="Models"
        subtitle={`${filteredModels.length} model${filteredModels.length === 1 ? "" : "s"}`}
      />
      {totalPages > 1 && (
        <List.Section title={`Page ${currentPage + 1} of ${totalPages}`}>
          <List.Item
            title="Browse Pages"
            subtitle={`${pageStart + 1}-${pageStart + visibleModels.length} of ${filteredModels.length}`}
            icon={Icon.List}
            actions={
              <ActionPanel>
                {currentPage < totalPages - 1 && (
                  <Action
                    title="Next Page"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={() => setPage(currentPage + 1)}
                  />
                )}
                {currentPage > 0 && (
                  <Action
                    title="Previous Page"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    onAction={() => setPage(currentPage - 1)}
                  />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
