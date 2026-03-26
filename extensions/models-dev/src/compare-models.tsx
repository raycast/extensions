import { List, Detail, Icon, ActionPanel, Action } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";
import { useModelsData } from "./hooks/useModelsData";
import { ModelListItem, ModelListSection } from "./components";
import { Model } from "./lib/types";
import { formatPrice, formatContextWindow } from "./lib/formatters";
import { filterOutDeprecated } from "./lib/filters";

function ComparisonView({ models, onEditSelection }: { models: Model[]; onEditSelection: () => void }) {
  // Build comparison markdown table
  const headers = ["", ...models.map((m) => m.name)];
  const headerRow = `| ${headers.join(" | ")} |`;
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;

  const rows = [
    ["**Provider**", ...models.map((m) => m.providerName)],
    ["**Context**", ...models.map((m) => formatContextWindow(m.limit?.context))],
    ["**Input Price**", ...models.map((m) => formatPrice(m.cost?.input))],
    ["**Output Price**", ...models.map((m) => formatPrice(m.cost?.output))],
    ["**Reasoning**", ...models.map((m) => (m.reasoning ? "Yes" : "No"))],
    ["**Tool Calling**", ...models.map((m) => (m.tool_call ? "Yes" : "No"))],
    ["**Vision**", ...models.map((m) => (m.modalities.input.includes("image") ? "Yes" : "No"))],
    [
      "**Audio**",
      ...models.map((m) =>
        m.modalities.input.includes("audio") || m.modalities.output.includes("audio") ? "Yes" : "No",
      ),
    ],
    ["**Structured Output**", ...models.map((m) => (m.structured_output ? "Yes" : "No"))],
    ["**Open Weights**", ...models.map((m) => (m.open_weights ? "Yes" : "No"))],
    ["**Knowledge Cutoff**", ...models.map((m) => m.knowledge ?? "Unknown")],
  ];

  const tableRows = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  const markdown = `# Model Comparison\n\n${headerRow}\n${separatorRow}\n${tableRows}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Model Comparison"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Edit Selection"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={onEditSelection}
          />
        </ActionPanel>
      }
    />
  );
}

export default function CompareAIModels() {
  const { data, isLoading } = useModelsData();
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const availableTitle = selectedModels.length > 0 ? "Available" : "Models";

  // Memoized to prevent unnecessary re-renders when other state changes.
  // Note: View switching (showComparison state) is the actual OOM fix -
  // it unmounts the List when comparison shows, preventing view stacking.
  const canAddToComparison = useMemo(() => selectedModels.length < 2, [selectedModels.length]);

  const selectedIds = useMemo(() => new Set(selectedModels.map((m) => `${m.providerId}-${m.id}`)), [selectedModels]);

  const availableModels = useMemo(() => {
    if (!data?.models) return [];
    if (showComparison || selectedModels.length >= 2) return [];
    return filterOutDeprecated(data.models.filter((m) => !selectedIds.has(`${m.providerId}-${m.id}`)));
  }, [data?.models, selectedIds, showComparison, selectedModels.length]);

  const handleToggleModel = useCallback((model: Model) => {
    const modelKey = `${model.providerId}-${model.id}`;

    setSelectedModels((prev) => {
      const isSelected = prev.some((m) => `${m.providerId}-${m.id}` === modelKey);

      if (isSelected) {
        const next = prev.filter((m) => `${m.providerId}-${m.id}` !== modelKey);
        if (next.length < 2) {
          setTimeout(() => setShowComparison(false), 0);
        }
        return next;
      }

      // Defensive guard: never allow selecting more than 2.
      if (prev.length >= 2) {
        return prev;
      }

      const newSelection = [...prev, model];
      if (newSelection.length === 2) {
        // Avoid stacking the heavy List view and the Detail view.
        // Switching views unmounts the List, reducing peak memory.
        setTimeout(() => setShowComparison(true), 0);
      }
      return newSelection;
    });
  }, []);

  const handleRemoveFromDropdown = useCallback((value: string) => {
    if (value !== "info") {
      setSelectedModels((prev) => prev.filter((m) => `${m.providerId}-${m.id}` !== value));
    }
  }, []);

  if (showComparison && selectedModels.length === 2) {
    return <ComparisonView models={selectedModels} onEditSelection={() => setShowComparison(false)} />;
  }

  return (
    <List
      isLoading={isLoading && !data?.models?.length}
      searchBarPlaceholder="Search models to compare..."
      searchBarAccessory={
        <List.Dropdown tooltip={`${selectedModels.length} selected`} value="info" onChange={handleRemoveFromDropdown}>
          <List.Dropdown.Item title={`${selectedModels.length}/2 models selected`} value="info" />
          {selectedModels.map((m) => (
            <List.Dropdown.Item
              key={`${m.providerId}-${m.id}`}
              title={`${m.name} (${m.providerName})`}
              value={`${m.providerId}-${m.id}`}
              icon={Icon.XMarkCircle}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No Models Found" description="No models match your search" icon={Icon.MagnifyingGlass} />
      {selectedModels.length > 0 && (
        <List.Section title={`Selected (${selectedModels.length}/2)`}>
          {selectedModels.map((model) => (
            <ModelListItem
              key={`selected-${model.providerId}-${model.id}`}
              model={model}
              primaryAction={
                <Action
                  title="Remove from Comparison"
                  icon={Icon.MinusCircle}
                  onAction={() => handleToggleModel(model)}
                />
              }
            />
          ))}
        </List.Section>
      )}

      <ModelListSection
        models={availableModels}
        title={availableTitle}
        onAddToComparison={handleToggleModel}
        canAddToComparison={canAddToComparison}
      />
    </List>
  );
}
