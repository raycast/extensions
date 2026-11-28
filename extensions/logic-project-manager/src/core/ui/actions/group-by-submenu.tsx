import { Action, ActionPanel, Icon } from "@raycast/api";
import type { GroupDateOption, GroupOption } from "@/core/ui/shared/grouping";
import { strings } from "@/strings";

// 分组子菜单：按 allowed 顺序渲染日期维度，None 固定放最后，当前项打勾。
export function GroupBySubmenu(props: {
  allowed: GroupDateOption[];
  value: GroupOption;
  onChange: (next: GroupOption) => void;
}) {
  const labels: Record<GroupDateOption, string> = {
    created: strings.groupByCreated,
    modified: strings.groupByModified,
  };
  return (
    <ActionPanel.Submenu title={strings.groupBy} icon={Icon.List}>
      {props.allowed.map((option) => (
        <Action
          key={option}
          title={labels[option]}
          icon={props.value === option ? Icon.CheckCircle : Icon.Circle}
          onAction={() => props.onChange(option)}
        />
      ))}
      <Action
        title={strings.groupNone}
        icon={props.value === "none" ? Icon.CheckCircle : Icon.Circle}
        onAction={() => props.onChange("none")}
      />
    </ActionPanel.Submenu>
  );
}
