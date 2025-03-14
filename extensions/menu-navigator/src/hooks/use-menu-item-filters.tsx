import { useCallback, useEffect, useMemo, useState } from "react";
import { MenusConfig, SectionTypes } from "../types";
import { showFailureToast } from "@raycast/utils";

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
    showFailureToast("Invalid menu configuration provided");
    return {
      options: [],
      filter: FILTER_TYPES.ALL,
      setFilter: () => {},
      filteredData: undefined,
    };
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

    let menus;
    // Check if it's a predefined filter type
    if (filter in filterFunctions) {
      menus = filterFunctions[filter as keyof typeof filterFunctions](
        data.menus,
      );
    } else {
      // Try to find a menu with matching name
      const menuIndex = data.menus.findIndex((menu) => menu.menu === filter);
      menus =
        menuIndex !== -1
          ? [data.menus[menuIndex]]
          : filterFunctions[FILTER_TYPES.ALL](data.menus);
    }

    setFilteredData({ ...data, menus });
  }, [filter, data]);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  return { options, filter, setFilter: handleFilterChange, filteredData };
}
