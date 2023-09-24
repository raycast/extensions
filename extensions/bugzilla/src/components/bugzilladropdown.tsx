import { List } from "@raycast/api";
import { useState } from "react";
import { BugzillaInstance } from "../interfaces/bugzilla";

interface DropdownProps {
  instanceList: BugzillaInstance[];
}

export function BugzillaDropdown({ instanceList }: DropdownProps) {
  const [selectedBugzillaId, setSelectedBugzillaId] = useState<string>();
  return (
    <List.Dropdown
      tooltip="Select Bugzilla Instance"
      value={selectedBugzillaId}
      onChange={setSelectedBugzillaId}
      placeholder="Search Bugzilla Instance"
    >
      {instanceList.map((instance: BugzillaInstance) => (
        <List.Dropdown.Item key={instance.id} value={instance.id} title={instance.displayName} />
      ))}
    </List.Dropdown>
  );
}
