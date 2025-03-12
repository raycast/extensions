import { useCallback, useEffect, useMemo, useState } from "react";
import { MenusConfig, SectionTypes } from "../types";
import { showHUD } from "@raycast/api";

const FILTER_TYPES = {
  ALL: "all-commands",
  SHORTCUT: "shortcut-commands",
  NO_SHORTCUT: "no-shortcut-commands",
  MENU: "menu-commands",
} as const;

interface MenuItemFiltersResult {
  options: SectionTypes[];
  filter: string;
  setFilter: (filter: string) => void;
  filteredData: MenusConfig | undefined;
}

const filterFunctions = {
  [FILTER_TYPES.ALL]: (menus: MenusConfig["menus"]) => menus,
  [FILTER_TYPES.SHORTCUT]: (menus: MenusConfig["menus"]) =>
    menus
      .map((menuGroup) => ({
        ...menuGroup,
        items: menuGroup.items.filter(
          (item) => item.shortcut?.length && item.key !== null,
        ),
      }))
      .filter((menuGroup) => menuGroup.items.length > 0),
  [FILTER_TYPES.NO_SHORTCUT]: (menus: MenusConfig["menus"]) =>
    menus
      .map((menuGroup) => ({
        ...menuGroup,
        items: menuGroup.items.filter(
          (item) => !item.shortcut?.length || item.key === null,
        ),
      }))
      .filter((menuGroup) => menuGroup.items.length > 0),
  [FILTER_TYPES.MENU]: (menus: MenusConfig["menus"]) =>
    menus
      .map((menuGroup) => ({
        ...menuGroup,
        items: menuGroup.items.filter((item) => item.submenu?.length),
      }))
      .filter((menuGroup) => menuGroup.items.length > 0),
};

export function useMenuItemFilters(data?: MenusConfig): MenuItemFiltersResult {
  if (
    data &&
    (!Array.isArray(data.menus) || !data.menus.every((menu) => "menu" in menu))
  ) {
    showHUD("Invalid menu configuration provided");
  }

  const [filter, setFilter] = useState<string>(FILTER_TYPES.ALL);
  const [filteredData, setFilteredData] = useState<MenusConfig | undefined>(
    data,
  );

  const options = useMemo(() => {
    if (!data?.menus?.length) return [];
    return data.menus.map((menu) => ({
      id: menu.menu,
      value: menu.menu,
    }));
  }, [data?.menus]);

  useEffect(() => {
    if (!data?.menus?.length) return;

    const filterFn = filterFunctions[filter as keyof typeof filterFunctions];
    const menus = filterFn
      ? filterFn(data.menus)
      : [data.menus[data.menus.findIndex((menu) => menu.menu === filter)]];

    setFilteredData({ ...data, menus });
  }, [filter, data]);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  return { options, filter, setFilter: handleFilterChange, filteredData };
}
