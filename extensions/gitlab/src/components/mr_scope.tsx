import { Action, ActionPanel, Color, Icon, Image } from "@raycast/api";
import { MRScope } from "./mr";

const MR_SCOPE_FILTERS: { value: Exclude<MRScope, MRScope.all>; title: string }[] = [
  { value: MRScope.created_by_me, title: "Created by me" },
  { value: MRScope.assigned_to_me, title: "Assigned to me" },
  { value: MRScope.reviews_for_me, title: "Reviews for me" },
];

function mrScopeSemanticIcon(scope: MRScope): Image.ImageLike {
  switch (scope) {
    case MRScope.created_by_me:
      return { source: Icon.Pencil, tintColor: Color.Yellow };
    case MRScope.assigned_to_me:
      return { source: Icon.Person, tintColor: Color.Blue };
    case MRScope.reviews_for_me:
      return Icon.Eye;
    default:
      return Icon.List;
  }
}

function mrScopeIcon(scope: MRScope, isActive: boolean): Image.ImageLike {
  if (isActive) {
    return Icon.Checkmark;
  }
  return mrScopeSemanticIcon(scope);
}

export function MergeRequestScopeSubmenu(props: { scope: MRScope; onSelect: (scope: MRScope) => void }) {
  return (
    <ActionPanel.Submenu
      title={
        props.scope === MRScope.all
          ? "All Scopes"
          : (MR_SCOPE_FILTERS.find((filter) => filter.value === props.scope)?.title ?? props.scope)
      }
      icon={props.scope === MRScope.all ? Icon.Person : mrScopeIcon(props.scope, false)}
    >
      <ActionPanel.Section>
        <Action title="All" autoFocus={props.scope === MRScope.all} onAction={() => props.onSelect(MRScope.all)} />
        {MR_SCOPE_FILTERS.map(({ value, title }) => (
          <Action
            key={value}
            title={title}
            icon={mrScopeIcon(value, props.scope === value)}
            autoFocus={props.scope === value}
            onAction={() => props.onSelect(value)}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
