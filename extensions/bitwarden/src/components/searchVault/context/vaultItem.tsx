import { createContext, useContext } from "react";
import { Item } from "~/types/vault";

const VaultItemContext = createContext<Item | null>(null);

export const useSelectedVaultItem = () => {
  const session = useContext(VaultItemContext);
  if (session == null) {
    throw new Error("useSelectVaultItem must be used within a VaultItemContext.Provider");
  }

  return session;
};

export default VaultItemContext;
