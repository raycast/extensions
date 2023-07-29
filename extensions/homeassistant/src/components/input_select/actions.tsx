import { Icon, Color, Action, ActionPanel } from "@raycast/api";
import { State } from "../../haapi";
import { callInputSelectSelectOptionService, getInputSelectSelectableOptions } from "./utils";

export function InputSelectOptionSelectAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const selectableOptions = getInputSelectSelectableOptions(s);
  if (!selectableOptions || selectableOptions.length <= 0) {
    return null;
  }
  return (
    <ActionPanel.Submenu title="Select" icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}>
      {selectableOptions?.map((o) => (
        <Action key={o} title={o} onAction={() => callInputSelectSelectOptionService(s, o)} />
      ))}
    </ActionPanel.Submenu>
  );
}
