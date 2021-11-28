import { OpenInBrowserAction, Icon, Color } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function OpenEntityHistoryAction(props: { state: State }): JSX.Element {
  const historyUrl = ha.urlJoin(`history?entity_id=${props.state.entity_id}`);
  return (
    <OpenInBrowserAction
      title="Open History in Browser"
      icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}
      url={historyUrl}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
    />
  );
}

export function OpenEntityLogbookAction(props: { state: State }): JSX.Element {
  const historyUrl = ha.urlJoin(`logbook?entity_id=${props.state.entity_id}`);
  return (
    <OpenInBrowserAction
      title="Open Logbook in Browser"
      icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}
      url={historyUrl}
      shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
    />
  );
}
