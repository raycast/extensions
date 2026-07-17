import { Action, ActionPanel, Icon } from "@raycast/api";
import { FieldGroup, FilterOption } from "../types";
import { FilterBySubmenu } from "./FilterBySubmenu";

interface ViewActionsProps {
  pageSize: number;
  setPageSize: (size: number) => void;
  showArchived: boolean;
  toggleShowArchived: () => void;
  fieldGroups?: FieldGroup[];
  selectedFilter?: FilterOption | null;
  onSelectFilter?: (filter: FilterOption | null) => void;
  organization?: string;
}

/**
 * Provides view-related actions like filtering, pagination, and view toggles
 */
export function ViewActions({
  pageSize,
  setPageSize,
  showArchived,
  toggleShowArchived,
  fieldGroups,
  selectedFilter,
  onSelectFilter,
  organization,
}: ViewActionsProps) {
  return (
    <ActionPanel.Section title="View">
      {fieldGroups && onSelectFilter && (
        <FilterBySubmenu
          fieldGroups={fieldGroups}
          selectedFilter={selectedFilter || null}
          onSelectFilter={onSelectFilter}
        />
      )}

      <Action
        title={showArchived ? "Hide Archived Instances" : "Show Archived Instances"}
        icon={showArchived ? Icon.EyeDisabled : Icon.Eye}
        onAction={toggleShowArchived}
      />

      <ActionPanel.Submenu
        title="Pagination"
        icon={Icon.ChevronRight}
        shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
      >
        <Action
          title="25"
          icon={pageSize === 25 ? Icon.CheckCircle : Icon.Circle}
          onAction={() => setPageSize(25)}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
        />
        <Action
          title="50"
          icon={pageSize === 50 ? Icon.CheckCircle : Icon.Circle}
          onAction={() => setPageSize(50)}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
        />
        <Action
          title="100"
          icon={pageSize === 100 ? Icon.CheckCircle : Icon.Circle}
          onAction={() => setPageSize(100)}
          shortcut={{ modifiers: ["cmd"], key: "3" }}
        />
      </ActionPanel.Submenu>

      {organization && (
        <Action.OpenInBrowser
          title="Open Workspace in Browser"
          url={`https://${organization}.origami.ms`}
          shortcut={{ modifiers: ["shift", "cmd"], key: "o" }}
        />
      )}
    </ActionPanel.Section>
  );
}
