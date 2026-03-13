import { List, ActionPanel } from "@raycast/api";
import { Model } from "../lib/types";
import { ModelListItem } from "./ModelListItem";

type ActionPanelChildren = Parameters<typeof ActionPanel>[0]["children"];

interface ModelListSectionProps {
  models: Model[];
  title?: string;
  onAddToComparison?: (model: Model) => void;
  getPrimaryAction?: (model: Model) => ActionPanelChildren;
  extraActions?: ActionPanelChildren;
}

export function ModelListSection({
  models,
  title,
  onAddToComparison,
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
          primaryAction={getPrimaryAction ? getPrimaryAction(model) : undefined}
          extraActions={extraActions}
        />
      ))}
    </List.Section>
  );
}
