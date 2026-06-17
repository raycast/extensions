import { List, Icon } from "@raycast/api";
import type { ScopeSummary } from "../types";

interface ScopeDropdownProps {
  selectedScope: string | null;
  onScopeChange: (newScope: string | null) => void;
  availableScopes: ScopeSummary[];
  isLoadingScopes: boolean;
}

export function ScopeDropdown({ selectedScope, onScopeChange, availableScopes, isLoadingScopes }: ScopeDropdownProps) {
  if (isLoadingScopes) {
    return (
      <List.Dropdown
        id="scopeFilter"
        tooltip="Filter by Scope"
        value={selectedScope || "all"}
        onChange={() => {}}
        storeValue
        isLoading={true}
      >
        <List.Dropdown.Item value="all" title="Loading Scopes..." icon={Icon.Hourglass} />
      </List.Dropdown>
    );
  }

  return (
    <List.Dropdown
      id="scopeFilter"
      tooltip="Filter by Scope"
      value={selectedScope || "all"}
      onChange={(newValue) => onScopeChange(newValue === "all" ? null : newValue)}
      storeValue
    >
      <List.Dropdown.Item value="all" title="All Scopes" icon={Icon.Globe} />
      {availableScopes.map((scope: ScopeSummary) => (
        <List.Dropdown.Item key={scope.id} value={scope.id} title={scope.name || "Untitled Scope"} />
      ))}
    </List.Dropdown>
  );
}
