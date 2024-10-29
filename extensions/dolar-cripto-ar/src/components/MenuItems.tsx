import { MenuBarExtra } from "@raycast/api";

import { Dispatch, SetStateAction } from "react";
import { Dollar } from "../types/types";
import React from "react";

interface MenuItemsProps {
  dollar: Dollar[];
  crypto: Dollar[];
  selectedCurrency: string;
  setSelectedCurrency: Dispatch<SetStateAction<string>>;
}

const MenuItems: React.FC<MenuItemsProps> = ({ dollar, crypto, selectedCurrency, setSelectedCurrency }) => {
  return (
    <>
      <MenuBarExtra.Item title="Dólar" />
      {dollar.map((dollar) => (
        <MenuBarExtra.Item
          key={dollar.name}
          title={`${dollar.name} ${selectedCurrency === dollar.name ? "✓" : ""}`}
          onAction={() => setSelectedCurrency(dollar.name)}
        />
      ))}

      <MenuBarExtra.Item title="Criptos" />
      {crypto.map((crypto) => (
        <MenuBarExtra.Item
          key={crypto.name}
          title={`${crypto.name} ${selectedCurrency === crypto.name ? "✓" : ""}`}
          onAction={() => setSelectedCurrency(crypto.name)}
        />
      ))}
    </>
  );
};

export default MenuItems;
