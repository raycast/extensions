import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { toggleSite } from "../libs/api";

//TODO: Implement optimistic update
//TODO: Ensure naming, site or domain?
export function ListItem(props: { id: string; active: boolean; type: string }) {
  const { id, active, type } = props;

  return (
    <List.Item
      id={id}
      key={id}
      title={`*.${id}`}
      icon={
        active
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
      actions={
        <ActionPanel title={`Manage ${id}`}>
          <Action
            title={`${active ? "Deactivate" : "Activate"} Site`}
            icon={active ? Icon.XMarkCircle : Icon.CheckCircle}
            onAction={() => toggleSite({ id, type, active: !active })}
          />
        </ActionPanel>
      }
    />
  );
}
