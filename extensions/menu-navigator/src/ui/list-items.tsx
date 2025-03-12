import { useMemo } from "react";
import { Application, List } from "@raycast/api";
import { MenusConfig } from "../types";
import { ListItemActions } from "./list-item-actions";
import { getListItemAccessories } from "../utils/list-item-accessories";

export interface ListItemsProps {
  app: Application;
  data?: MenusConfig;
  refresh: () => Promise<void>;
}

export function ListItems({ app, data, refresh }: ListItemsProps) {
  const renderedList = useMemo(() => {
    if (!data?.menus?.length) return null;

    return data.menus.map((menu) => (
      <List.Section key={`${app.name}-${menu.menu}`} title={menu.menu}>
        {menu.items?.map((item) => (
          <List.Item
            key={`${app.name}-${item.menu}-${item.shortcut}`}
            title={item.shortcut}
            accessories={getListItemAccessories(item)}
            actions={
              <ListItemActions app={app} item={item} refresh={refresh} />
            }
          />
        ))}
      </List.Section>
    ));
  }, [data, app.name, refresh]);

  return renderedList;
}
