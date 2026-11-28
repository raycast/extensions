import { Action, ActionPanel, Icon } from "@raycast/api";
import { ALL_SORT_OPTIONS, type SortOption } from "@/core/ui/shared/sorting";
import { strings } from "@/strings";

// 排序子菜单:只渲染 allowed 里的选项,当前项打勾。
export function SortBySubmenu(props: {
  allowed: SortOption[];
  value: SortOption;
  onChange: (next: SortOption) => void;
}) {
  const options = ALL_SORT_OPTIONS.filter((option) => props.allowed.includes(option.value));

  return (
    <ActionPanel.Submenu title={strings.sortBy} icon={Icon.NumberList}>
      {options.map((option) => (
        <Action
          key={option.value}
          title={option.title}
          icon={props.value === option.value ? Icon.CheckCircle : Icon.Circle}
          onAction={() => props.onChange(option.value)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
