import { List } from "@raycast/api";
import { StatusFilter, TypeFilter, parseFilterValue } from "../utils";

interface TaskFilterDropdownProps {
  onFilterChange: (status: StatusFilter, type: TypeFilter) => void;
}

/**
 * Reusable dropdown component for filtering tasks by status and type.
 * Uses storeValue to persist filter selection across sessions.
 */
export function TaskFilterDropdown({ onFilterChange }: TaskFilterDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Filter"
      storeValue
      onChange={(value) => {
        const parsed = parseFilterValue(value);
        onFilterChange(parsed.status, parsed.type);
      }}
    >
      <List.Dropdown.Section title="Open">
        <List.Dropdown.Item title="Open - All Types" value="open:all" />
        <List.Dropdown.Item title="Open - Conversations" value="open:Conversation" />
        <List.Dropdown.Item title="Open - Tickets" value="open:Ticket" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Completed">
        <List.Dropdown.Item title="Completed - All Types" value="completed:all" />
        <List.Dropdown.Item title="Completed - Conversations" value="completed:Conversation" />
        <List.Dropdown.Item title="Completed - Tickets" value="completed:Ticket" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="All Status">
        <List.Dropdown.Item title="All - All Types" value="all:all" />
        <List.Dropdown.Item title="All - Conversations" value="all:Conversation" />
        <List.Dropdown.Item title="All - Tickets" value="all:Ticket" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
