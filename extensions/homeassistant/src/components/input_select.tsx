import { Icon, Color, Action, ActionPanel } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function InputSelectOptionSelectAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_select")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  const options: string[] | undefined = s.attributes.options;
  if (!options || options.length <= 0) {
    return null;
  }
  const selectableOptions = options?.filter((o) => o !== s.state);
  const handle = async (option: string) => {
    await ha.callService("input_select", "select_option", { entity_id: s.entity_id, option });
  };
  return (
    <ActionPanel.Submenu title="Select" icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}>
      {selectableOptions?.map((o) => (
        <Action key={o} title={o} onAction={() => handle(o)} />
      ))}
    </ActionPanel.Submenu>
  );
}
