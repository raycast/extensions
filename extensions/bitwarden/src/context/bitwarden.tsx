import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Bitwarden } from "~/api/bitwarden";
import { VaultLoadingFallback } from "~/components/searchVault/VaultLoadingFallback";

const BitwardenContext = createContext<Bitwarden | null>(null);

export type BitwardenProviderProps = PropsWithChildren;

export const BitwardenProvider = (props: BitwardenProviderProps) => {
  const { children } = props;
  const [bitwarden, setBitwarden] = useState<Bitwarden>();

  useEffect(() => {
    void new Bitwarden().initialize().then(setBitwarden);
  }, []);

  if (!bitwarden) return <VaultLoadingFallback />;

  return <BitwardenContext.Provider value={bitwarden}>{children}</BitwardenContext.Provider>;
};

export const useBitwarden = () => {
  const context = useContext(BitwardenContext);
  if (context == null) {
    throw new Error("useBitwarden must be used within a BitwardenProvider");
  }

  return context;
};

export default BitwardenContext;
