import { List } from "@raycast/api";
import type { ClerkApp } from "../types";

export function AppDropdown(props: { apps: ClerkApp[]; defaultId: string; onChange: (id: string) => void }) {
  if (props.apps.length === 0) return null;
  // Uncontrolled: `defaultValue` seeds the initial selection to the active app.
  // A controlled `value` gets clobbered by the mount-time `onChange` Raycast
  // fires with the first item, which made the dropdown reset to the first app.
  return (
    <List.Dropdown tooltip="Active App" defaultValue={props.defaultId} onChange={props.onChange}>
      {props.apps.map((app) => (
        <List.Dropdown.Item key={app.id} title={app.name} value={app.id} />
      ))}
    </List.Dropdown>
  );
}
