import { Action, ActionPanel, Color, Icon, Image } from "@raycast/api";
import { GitLabIcons } from "../icons";

export type MROrderBy =
  | "created_at"
  | "updated_at"
  | "merged_at"
  | "label_priority"
  | "priority"
  | "milestone_due"
  | "popularity"
  | "title";

export type MRSearchOrderBy = "default" | MROrderBy;

export const MR_DEFAULT_ORDER_BY: MRSearchOrderBy = "default";

const MR_ORDER_BY_OPTIONS: { value: MROrderBy; title: string }[] = [
  { value: "created_at", title: "Created" },
  { value: "updated_at", title: "Updated" },
  { value: "merged_at", title: "Merged" },
  { value: "title", title: "Title" },
  { value: "priority", title: "Priority" },
  { value: "label_priority", title: "Label Priority" },
  { value: "milestone_due", title: "Milestone Due" },
  { value: "popularity", title: "Popularity" },
];

function mrOrderBySemanticIcon(orderBy: MROrderBy): Image.ImageLike {
  switch (orderBy) {
    case "created_at":
      return Icon.Calendar;
    case "updated_at":
      return Icon.ArrowClockwise;
    case "merged_at":
      return { source: GitLabIcons.merged, tintColor: Color.Purple, mask: Image.Mask.Circle };
    case "title":
      return Icon.Text;
    case "priority":
      return Icon.ArrowUp;
    case "label_priority":
      return Icon.Tag;
    case "milestone_due":
      return { source: GitLabIcons.milestone, tintColor: Color.PrimaryText };
    case "popularity":
      return Icon.Star;
    default:
      return Icon.List;
  }
}

function mrSearchOrderByIcon(orderBy: MRSearchOrderBy, isActive: boolean): Image.ImageLike {
  if (orderBy === MR_DEFAULT_ORDER_BY) {
    return isActive ? Icon.Checkmark : Icon.List;
  }
  if (isActive) {
    return Icon.Checkmark;
  }
  return mrOrderBySemanticIcon(orderBy as MROrderBy);
}

export function appendMROrderByParams(params: Record<string, unknown>, orderBy: MRSearchOrderBy): void {
  if (orderBy === MR_DEFAULT_ORDER_BY) {
    return;
  }
  params.order_by = orderBy;
  params.sort = "desc";
}

export function MergeRequestSortSubmenu(props: {
  orderBy: MRSearchOrderBy;
  onSelect: (orderBy: MRSearchOrderBy) => void;
}) {
  return (
    <ActionPanel.Submenu title="Sort by" shortcut={{ modifiers: ["cmd"], key: "s" }} icon={Icon.ChevronUpDown}>
      <ActionPanel.Section>
        <Action
          title="Default"
          icon={mrSearchOrderByIcon(MR_DEFAULT_ORDER_BY, props.orderBy === MR_DEFAULT_ORDER_BY)}
          autoFocus={props.orderBy === MR_DEFAULT_ORDER_BY}
          onAction={() => props.onSelect(MR_DEFAULT_ORDER_BY)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {MR_ORDER_BY_OPTIONS.map(({ value, title }) => (
          <Action
            key={value}
            title={title}
            icon={mrSearchOrderByIcon(value, props.orderBy === value)}
            autoFocus={props.orderBy === value}
            onAction={() => props.onSelect(value)}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
