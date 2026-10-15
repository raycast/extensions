import { Grid, Icon, List } from "@raycast/api";
import { categoryTitle, t } from "../i18n.ts";
import { locationValue } from "../bookmark-form.tsx";
import { TRASH_LOCATION } from "../model.ts";
import type { Catalog } from "../model.ts";

export function ScopeDropdown({
  catalog,
  scope,
  onChange,
  view = "list",
}: {
  catalog: Catalog;
  scope: string;
  onChange: (scope: string) => void;
  view?: "list" | "grid";
}) {
  const Root = view === "grid" ? Grid : List;
  return (
    <Root.Dropdown tooltip={t("筛选范围")} value={scope} onChange={onChange}>
      <Root.Dropdown.Item title={t("全部")} value="all" icon={Icon.List} />
      <Root.Dropdown.Item
        title={t("收藏")}
        value="favorites"
        icon={Icon.Star}
      />
      <Root.Dropdown.Item
        title={t("最近使用")}
        value="recent"
        icon={Icon.ArrowClockwise}
      />
      <Root.Dropdown.Item title={t("回收站")} value="trash" icon={Icon.Trash} />
      {catalog.groups
        .filter(
          (group) => !group.isDeleted && group.id !== TRASH_LOCATION.groupId,
        )
        .map((group) => (
          <Root.Dropdown.Section
            key={group.id}
            title={categoryTitle(group.id, group.name)}
          >
            {group.children
              .filter((sub) => !sub.isDeleted)
              .map((sub) => (
                <Root.Dropdown.Item
                  key={`${group.id}/${sub.id}`}
                  value={locationValue({
                    groupId: group.id,
                    subGroupId: sub.id,
                  })}
                  title={categoryTitle(sub.id, sub.name)}
                />
              ))}
          </Root.Dropdown.Section>
        ))}
    </Root.Dropdown>
  );
}
