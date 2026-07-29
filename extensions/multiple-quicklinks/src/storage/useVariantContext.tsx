import React from "react";
import { Variant } from "../types";
import { LocalStorage } from "@raycast/api";

type VariantContextType = {
  variants: Variant[];
  setVariants: React.Dispatch<React.SetStateAction<Variant[]>>;
  saveVariants: (newVariants: Variant[]) => Promise<void>;
};

export const VariantContextStore = React.createContext<VariantContextType | undefined>(undefined);

const VariantContext = ({ children }: { children: React.ReactNode }) => {
  const [variants, setVariants] = React.useState<Variant[]>([]);

  const saveVariants = async (newVariants: Variant[]) => {
    setVariants(newVariants);
    await LocalStorage.setItem("variants", JSON.stringify(newVariants));
  };

  return (
    <VariantContextStore.Provider value={{ variants, setVariants, saveVariants }}>
      {children}
    </VariantContextStore.Provider>
  );
};

const useVariantContext = () => {
  const variant = React.useContext(VariantContextStore);
  console.log({ variant });
  if (!variant) {
    throw new Error("useVariantContext must be used within a VariantContextProvider");
  }
  return variant;
};

export { VariantContext, useVariantContext };
