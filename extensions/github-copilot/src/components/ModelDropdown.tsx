import { Form } from "@raycast/api";
import { useMemo, useEffect } from "react";
import { useModels } from "../hooks/useModels";
import { Model } from "../services/models";

const isAutoModel = (model: Model) => model.id === "auto";

// Convert a raw model_picker_category value (e.g. "lightweight_models") into a
// human-friendly section title (e.g. "Lightweight Models").
const humanizeCategory = (category: string) =>
  category
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");

// Preferred category order. Any categories not in this list are appended after
// the known ones in the order they first appear from the API.
const CATEGORY_ORDER = ["lightweight", "versatile", "powerful"];

const categorySortIndex = (category: string) => {
  const index = CATEGORY_ORDER.indexOf(category.toLowerCase());
  return index === -1 ? CATEGORY_ORDER.length : index;
};

// Group models by their model_picker_category, preserving the order in which
// models first appear within each category. Models without a category are
// grouped together at the end under an "Other" section. Auto models are always
// rendered first, outside of any category section.
interface ModelGroup {
  title: string | null;
  models: Model[];
  rawCategory: string;
}

const groupModelsByCategory = (models: Model[]): { autoModels: Model[]; groups: ModelGroup[] } => {
  const autoModels: Model[] = [];
  const nonAutoModels: Model[] = [];

  for (const model of models) {
    if (isAutoModel(model)) {
      autoModels.push(model);
    } else {
      nonAutoModels.push(model);
    }
  }

  const groups: ModelGroup[] = [];
  const groupsByKey = new Map<string, ModelGroup>();

  for (const model of nonAutoModels) {
    const key = model.model_picker_category ?? "";
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        title: model.model_picker_category ? humanizeCategory(model.model_picker_category) : null,
        models: [],
        rawCategory: key,
      };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    group.models.push(model);
  }

  for (const group of groups) {
    group.models.sort((a, b) => b.name.localeCompare(a.name));
  }

  return {
    autoModels,
    groups: groups.sort((a, b) => categorySortIndex(a.rawCategory) - categorySortIndex(b.rawCategory)),
  };
};

export function ModelDropdown(
  props: Readonly<{
    itemProps: Form.ItemProps<string>;
    onLoadingChange?: (isLoading: boolean) => void;
  }>,
) {
  const { models, isLoading } = useModels();

  const { onChange, value, ...restItemProps } = props.itemProps;

  // Notify parent about loading state changes
  useEffect(() => {
    props.onLoadingChange?.(isLoading);
  }, [isLoading, props.onLoadingChange]);

  const controlledValue = useMemo(() => {
    if (value && models.map((model) => model.id).includes(value)) {
      return value;
    } else if (models.length > 0) {
      return models[0].id;
    } else {
      return ""; // Fallback to empty string to keep it controlled
    }
  }, [models, value]);

  const { autoModels, groups } = useMemo(() => groupModelsByCategory(models), [models]);

  // Update the form value when controlledValue changes
  useEffect(() => {
    if (controlledValue && controlledValue !== value && onChange) {
      onChange(controlledValue);
    }
  }, [controlledValue, value, onChange]);

  if (models.length === 0) return null;

  const renderItem = (model: Model) => <Form.Dropdown.Item key={model.id} title={model.name} value={model.id} />;

  return (
    <Form.Dropdown
      title="Model"
      placeholder="Select a model"
      isLoading={isLoading}
      onChange={(value) => {
        onChange?.(value);
      }}
      value={controlledValue}
      {...restItemProps}
    >
      {autoModels.map(renderItem)}
      {groups.map((group) =>
        group.title ? (
          <Form.Dropdown.Section key={group.title} title={group.title}>
            {group.models.map(renderItem)}
          </Form.Dropdown.Section>
        ) : (
          group.models.map(renderItem)
        ),
      )}
    </Form.Dropdown>
  );
}
