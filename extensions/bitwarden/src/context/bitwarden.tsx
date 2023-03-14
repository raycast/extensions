import { Detail } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Bitwarden } from "~/api/bitwarden";

const BitwardenContext = createContext<Bitwarden | null>(null);

export type BitwardenProviderProps = PropsWithChildren;

export const BitwardenProvider = (props: BitwardenProviderProps) => {
  const { children } = props;
  const [bitwarden, setBitwarden] = useState<Bitwarden>();

  useEffect(() => {
    new Bitwarden().initialize().then(setBitwarden);
  }, []);

  if (!bitwarden) return <Detail isLoading />;

  return <BitwardenContext.Provider value={bitwarden}>{children}</BitwardenContext.Provider>;
};

export const useBitwarden = () => {
  const session = useContext(BitwardenContext);
  if (session == null) {
    throw new Error("useBitwarden must be used within a BitwardenProvider");
  }

  return session;
};

export default BitwardenContext;
