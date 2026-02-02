import { List, Icon } from "@raycast/api";
import { useState, useMemo } from "react";
import { useModelsData } from "./hooks/useModelsData";
import { ModelListSection } from "./components";

type PriceFilter =
  | "all"
  | "free"
  | "non-free"
  | "under-1"
  | "under-2"
  | "under-5"
  | "under-15"
  | "over-1"
  | "over-2"
  | "over-5"
  | "over-15";

const PRICE_FILTERS: { id: PriceFilter; label: string }[] = [
  { id: "all", label: "All Prices" },
  { id: "free", label: "Free output" },
  { id: "non-free", label: "Paid output" },
  { id: "under-1", label: "Under $1/M output" },
  { id: "under-2", label: "Under $2/M output" },
  { id: "under-5", label: "Under $5/M output" },
  { id: "under-15", label: "Under $15/M output" },
  { id: "over-1", label: "Over $1/M output" },
  { id: "over-2", label: "Over $2/M output" },
  { id: "over-5", label: "Over $5/M output" },
  { id: "over-15", label: "Over $15/M output" },
];

export default function AIModelsByPrice() {
  const { data, isLoading } = useModelsData();
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const sectionTitle = "Models";

  const filteredModels = useMemo(() => {
    if (!data?.models) return [];

    // Only include models with output pricing
    let models = data.models.filter((m) => m.cost?.output !== undefined);

    // Apply price filter based on output price
    switch (priceFilter) {
      case "free":
        models = models.filter((m) => m.cost?.output === 0);
        break;
      case "non-free":
        models = models.filter((m) => m.cost?.output !== undefined && m.cost.output > 0);
        break;
      case "under-1":
        models = models.filter((m) => m.cost && m.cost.output <= 1);
        break;
      case "under-2":
        models = models.filter((m) => m.cost && m.cost.output <= 2);
        break;
      case "under-5":
        models = models.filter((m) => m.cost && m.cost.output <= 5);
        break;
      case "under-15":
        models = models.filter((m) => m.cost && m.cost.output <= 15);
        break;
      case "over-1":
        models = models.filter((m) => m.cost && m.cost.output > 1);
        break;
      case "over-2":
        models = models.filter((m) => m.cost && m.cost.output > 2);
        break;
      case "over-5":
        models = models.filter((m) => m.cost && m.cost.output > 5);
        break;
      case "over-15":
        models = models.filter((m) => m.cost && m.cost.output > 15);
        break;
    }

    // Sort by output price (ascending - cheapest first)
    models = [...models].sort((a, b) => {
      const priceA = a.cost?.output ?? Infinity;
      const priceB = b.cost?.output ?? Infinity;
      return priceA - priceB;
    });

    return models;
  }, [data?.models, priceFilter]);

  return (
    <List
      isLoading={isLoading && !data?.models?.length}
      searchBarPlaceholder="Search models..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Price"
          value={priceFilter}
          onChange={(value) => setPriceFilter(value as PriceFilter)}
        >
          {PRICE_FILTERS.map((filter) => (
            <List.Dropdown.Item key={filter.id} title={filter.label} value={filter.id} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Models Found"
        description="No models match the selected price filter"
        icon={Icon.MagnifyingGlass}
      />

      <ModelListSection models={filteredModels} title={sectionTitle} />
    </List>
  );
}
