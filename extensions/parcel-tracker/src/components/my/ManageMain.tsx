import { List, LocalStorage, showToast, Toast } from "@raycast/api";
<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import { getVendors } from "../../api/api";
import { IVendorData } from "../../model/vendorData";
=======
import { useEffect, useState } from "react";
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
import PackageItem from "./PackageItem";

export interface IItems {
  [key: string]: string;
}

export default function ManageMain() {
  const [packages, setPackages] = useState<IItems>({});
<<<<<<< HEAD
  const [vendors, setVendors] = useState<IVendorData[]>(new Array<IVendorData>());

=======
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
  useEffect(() => {
    LocalStorage.allItems().then((response) => {
      setPackages(response);
    });
<<<<<<< HEAD
    getVendors().then((response) => setVendors(response.data));
=======
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
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
<<<<<<< HEAD
    return packages[itemKey].split("//")[1] === "Y";
  };

  const findVendorByCode = (itemKey: string): IVendorData | null => {
    const code = itemKey.split("-")[0];
    return vendors.find((v) => v.code === code) || null;
=======
    return packages[itemKey].split("//")[1] === "true";
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
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
<<<<<<< HEAD
                vendor={findVendorByCode(itemKey)}
=======
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
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
<<<<<<< HEAD
                vendor={findVendorByCode(itemKey)}
=======
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
              />
            );
          })}
      </List.Section>
    </List>
  );
}
