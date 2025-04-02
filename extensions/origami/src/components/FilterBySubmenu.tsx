import { Action, ActionPanel, Icon } from "@raycast/api";
import { Field, FieldGroup, FilterOption } from "../types";
import { getFilterOperator } from "../utils/filters";

interface FilterBySubmenuProps {
  fieldGroups: FieldGroup[] | undefined;
  onSelectFilter: (filter: FilterOption | null) => void;
  selectedFilter: FilterOption | null;
}

/**
 * Submenu component for selecting a field to filter by
 * Provides options for filtering by all fields or by specific fields
 */
export function FilterBySubmenu({ fieldGroups, onSelectFilter, selectedFilter }: FilterBySubmenuProps) {
  if (!fieldGroups || fieldGroups.length === 0) {
    return (
      <ActionPanel.Submenu title="Filter by" icon={Icon.Filter}>
        <Action
          title="All Fields"
          icon={selectedFilter === null ? Icon.CheckCircle : Icon.Circle}
          onAction={() => onSelectFilter(null)}
        />
      </ActionPanel.Submenu>
    );
  }

  // Extract all fields from all field groups
  const allFields: Field[] = [];
  fieldGroups.forEach((group) => {
    group.fields_data.forEach((fieldsArray) => {
      fieldsArray.forEach((field) => {
        // Only include fields that have a supported operator
        if (getFilterOperator(field.field_type_name)) {
          allFields.push(field);
        }
      });
    });
  });

  // Remove duplicate fields (by field_id)
  const uniqueFields = allFields.filter(
    (field, index, self) => index === self.findIndex((f) => f.field_id === field.field_id),
  );

  return (
    <ActionPanel.Submenu title="Filter by" icon={Icon.Filter}>
      <Action
        title="All Fields"
        icon={selectedFilter === null ? Icon.CheckCircle : Icon.Circle}
        onAction={() => onSelectFilter(null)}
      />

      {uniqueFields.map((field) => {
        const operator = getFilterOperator(field.field_type_name);
        const isSelected = selectedFilter?.fieldId === field.field_id;

        return (
          <Action
            key={field.field_id}
            title={field.field_name}
            icon={isSelected ? Icon.CheckCircle : Icon.Circle}
            onAction={() =>
              onSelectFilter({
                fieldId: field.field_id,
                fieldName: field.field_name,
                fieldDataName: field.field_data_name,
                fieldTypeName: field.field_type_name,
                operator,
              })
            }
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}
