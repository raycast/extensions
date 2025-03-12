import { useMemo } from "react";
import { Application, List } from "@raycast/api";
import { MenuItem } from "../types";
import { ListItemActions } from "./list-item-actions";
import { getListItemAccessories } from "../utils/list-item-accessories";

interface Section {
  title: string;
  items: MenuItem[];
}

export interface SubmenuListItemsProps {
  app: Application;
  item: MenuItem;
  refresh: () => Promise<void>;
}

/**
 * Renders a list of submenu items organized into sections
 */
export function SubMenuListItems({
  app,
  item,
  refresh,
}: SubmenuListItemsProps) {
  const submenuSections = useMemo(
    () =>
      item.submenu?.reduce((sections: Section[], subItem) => {
        if (subItem.isSectionTitle) {
          sections.push({
            title: subItem.shortcut,
            items: [],
          });
        } else {
          if (sections.length === 0) {
            sections.push({
              title: item.menu,
              items: [],
            });
          }
          sections[sections.length - 1].items.push(subItem);
        }
        return sections;
      }, []),
    [item.submenu, item.menu],
  );

  const name = app?.name ? `${app.name} > ${item.menu}` : "";

  return (
    <List
      navigationTitle={item.shortcut}
      searchBarPlaceholder={`Search ${name} commands...`}
    >
      {submenuSections?.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((subItem) => (
            <List.Item
              key={`${app.name}-${subItem.menu}-${subItem.shortcut}`}
              title={subItem.shortcut}
              accessories={getListItemAccessories(subItem)}
              actions={
                <ListItemActions app={app} item={subItem} refresh={refresh} />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
