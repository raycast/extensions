import { List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getVendors } from "../../api/api";
import { IVendorData } from "../../model/vendorData";
import PackageItem from "./PackageItem";

export interface IItems {
  [key: string]: string;
}

interface State {
  loading: boolean;
  packages: IItems;
  vendors: IVendorData[];
}

export default function ManageMain() {
  const [state, setState] = useState<State>({ loading: true, packages: {}, vendors: [] });

  useEffect(() => {
    (async () => {
      try {
        const packages = await LocalStorage.allItems();
        const { data: vendors } = await getVendors();
        setState({ loading: false, packages, vendors });
      } catch (e) {
        setState((previous) => ({ ...previous, loading: false }));
      }
    })();
  }, []);

  const handleRemove = (itemKey: string) => {
    LocalStorage.removeItem(itemKey).then(() => {
      showToast({ style: Toast.Style.Success, title: "Removed." });
      const newPackages = { ...state.packages };
      delete newPackages[itemKey];
      setState((previous) => ({ ...previous, packages: newPackages }));
    });
  };

  const filterByComplete = (isComplete: boolean): Array<string> => {
    return Object.keys(state.packages).filter((itemKey) => getIsComplete(itemKey) == isComplete);
  };

  const getItemName = (itemKey: string): string => {
    return state.packages[itemKey].split("//")[0];
  };

  const getIsComplete = (itemKey: string): boolean => {
    return state.packages[itemKey].split("//")[1] === "Y";
  };

  const findVendorByCode = (itemKey: string): IVendorData | null => {
    const code = itemKey.split("-")[0];
    return state.vendors.find((v) => v.code === code) || null;
  };

  return (
    <List isLoading={state.loading}>
      <List.Section title="Delivery NOT completed" key="notCompleted">
        {filterByComplete(false).map((itemKey) => {
          return (
            <PackageItem
              key={itemKey}
              itemKey={itemKey}
              itemName={getItemName(itemKey)}
              isComplete={getIsComplete(itemKey)}
              handleRemove={handleRemove}
              vendor={findVendorByCode(itemKey)}
            />
          );
        })}
      </List.Section>
      <List.Section title="Delivery completed" key="completed">
        {filterByComplete(true).map((itemKey) => {
          return (
            <PackageItem
              key={itemKey}
              itemKey={itemKey}
              itemName={getItemName(itemKey)}
              isComplete={getIsComplete(itemKey)}
              handleRemove={handleRemove}
              vendor={findVendorByCode(itemKey)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
