import { List, ActionPanel } from "@raycast/api";
import { memo } from "react";
import { Model } from "../lib/types";
import { ModelListItem } from "./ModelListItem";

type ActionPanelChildren = Parameters<typeof ActionPanel>[0]["children"];

interface ModelListSectionProps {
  models: Model[];
  title?: string;
  onAddToComparison?: (model: Model) => void;
  canAddToComparison?: boolean;
  getPrimaryAction?: (model: Model) => ActionPanelChildren;
  extraActions?: ActionPanelChildren;
}

// Memoized to prevent re-rendering all list items when parent state changes.
// With 3,800+ models, avoiding unnecessary renders improves performance.
export const ModelListSection = memo(function ModelListSection({
  models,
  title,
  onAddToComparison,
  canAddToComparison,
  getPrimaryAction,
  extraActions,
}: ModelListSectionProps) {
  if (models.length === 0) return null;

  return (
    <List.Section title={title}>
      {models.map((model) => (
        <ModelListItem
          key={`${model.providerId}-${model.id}`}
          model={model}
          onAddToComparison={onAddToComparison}
          canAddToComparison={canAddToComparison}
          primaryAction={getPrimaryAction ? getPrimaryAction(model) : undefined}
          extraActions={extraActions}
        />
      ))}
    </List.Section>
  );
});
