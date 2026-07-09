import { List } from "@raycast/api";
import { memo } from "react";
import { Model } from "../lib/types";
import { ModelListItem } from "./ModelListItem";

interface ModelListSectionProps {
  models: Model[];
  title?: string;
  subtitle?: string;
}

export const ModelListSection = memo(function ModelListSection({ models, title, subtitle }: ModelListSectionProps) {
  if (models.length === 0) return null;

  return (
    <List.Section title={title} subtitle={subtitle}>
      {models.map((model) => (
        <ModelListItem key={`${model.providerId}-${model.id}`} model={model} />
      ))}
    </List.Section>
  );
});
