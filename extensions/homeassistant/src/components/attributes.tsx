import { ActionPanel, CopyToClipboardAction, List } from "@raycast/api";
import { State } from "../haapi";

export function EntityAttributesList(props: { state: State }) {
  const state = props.state;
  const title = state.attributes.friendly_name
    ? `${state.attributes.friendly_name} (${state.entity_id})`
    : `${state.entity_id}`;
  return (
    <List searchBarPlaceholder="Search entity attributes">
      <List.Section title={`Attributes of ${title}`}>
        {Object.entries(state.attributes).map(([k, v]) => (
          <List.Item
            key={state.entity_id + k}
            title={k}
            accessoryTitle={`${v}`}
            actions={
              <ActionPanel>
                <CopyToClipboardAction content={`${v}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
