import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { GitLabIcons } from "../icons";
import { MRScope, MRState } from "./mr";
import { MergeRequestScopeSubmenu } from "./mr_scope";
import { mrStateFilterIcon } from "./mr_status";

const MR_STATE_FILTERS: { state: MRState; title: string }[] = [
  { state: MRState.opened, title: "Open" },
  { state: MRState.merged, title: "Merged" },
  { state: MRState.closed, title: "Closed" },
];

function MergeRequestStatusSubmenu(props: { state: MRState; onSelect: (state: MRState) => void }) {
  return (
    <ActionPanel.Submenu
      title={
        props.state === MRState.all
          ? "All Statuses"
          : `Only ${MR_STATE_FILTERS.find((filter) => filter.state === props.state)?.title ?? props.state}`
      }
      icon={
        props.state === MRState.all
          ? { source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }
          : mrStateFilterIcon(props.state, false)
      }
    >
      <ActionPanel.Section>
        <Action title="All" autoFocus={props.state === MRState.all} onAction={() => props.onSelect(MRState.all)} />
        {MR_STATE_FILTERS.map(({ state, title }) => (
          <Action
            key={state}
            title={title}
            icon={mrStateFilterIcon(state, props.state === state)}
            autoFocus={props.state === state}
            onAction={() => props.onSelect(state)}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}

export function MergeRequestFilterSubmenu(props: {
  scope: MRScope;
  onSelectScope: (scope: MRScope) => void;
  state: MRState;
  onSelectState: (state: MRState) => void;
  draftOnly: boolean;
  onToggleDraftOnly: () => void;
}) {
  return (
    <ActionPanel.Submenu title="Filter" shortcut={{ modifiers: ["cmd"], key: "f" }} icon={Icon.Filter}>
      <MergeRequestScopeSubmenu scope={props.scope} onSelect={props.onSelectScope} />
      <MergeRequestStatusSubmenu state={props.state} onSelect={props.onSelectState} />
      <Action
        title={props.draftOnly ? "Hide Drafts" : "Show Drafts"}
        icon={
          props.draftOnly
            ? { source: Icon.Xmark, tintColor: Color.Red }
            : { source: "https://api.iconify.design/tabler/edit.svg" }
        }
        onAction={props.onToggleDraftOnly}
      />
    </ActionPanel.Submenu>
  );
}
