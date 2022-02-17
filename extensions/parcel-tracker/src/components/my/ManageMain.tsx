import { List, LocalStorage, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import PackageItem from "./PackageItem";

export interface IItems {
  [key: string]: string;
}

export default function ManageMain() {
  const [packages, setPackages] = useState<IItems>({});
  useEffect(() => {
    LocalStorage.allItems().then((response) => {
      setPackages(response);
    });
  }, []);

  const handleRemove = (itemKey: string) => {
    LocalStorage.removeItem(itemKey).then(() => {
      showToast({ style: Toast.Style.Success, title: "Removed." });
      const newPackages = { ...packages };
      delete newPackages[itemKey];
      setPackages(newPackages);
    });
  };

  const filterByComplete = (isComplete: boolean): Array<string> => {
    return Object.keys(packages).filter((itemKey) => getIsComplete(itemKey) == isComplete);
  };

  const getItemName = (itemKey: string): string => {
    return packages[itemKey].split("//")[0];
  };

  const getIsComplete = (itemKey: string): boolean => {
    return packages[itemKey].split("//")[1] === "true";
  };

  return (
    <List>
      <List.Section title="Delivery NOT completed" key="notCompleted">
        {packages &&
          filterByComplete(false).map((itemKey) => {
            return (
              <PackageItem
                key={itemKey}
                itemKey={itemKey}
                itemName={getItemName(itemKey)}
                isComplete={getIsComplete(itemKey)}
                handleRemove={handleRemove}
              />
            );
          })}
      </List.Section>
      <List.Section title="Delivery completed" key="completed">
        {packages &&
          filterByComplete(true).map((itemKey) => {
            return (
              <PackageItem
                key={itemKey}
                itemKey={itemKey}
                itemName={getItemName(itemKey)}
                isComplete={getIsComplete(itemKey)}
                handleRemove={handleRemove}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
