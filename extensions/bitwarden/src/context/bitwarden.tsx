import { createContext, PropsWithChildren, useContext } from "react";
import { Bitwarden } from "~/api/bitwarden";

const BitwardenContext = createContext<Bitwarden | null>(null);

export type BitwardenProviderProps = PropsWithChildren;

export const BitwardenProvider = (props: BitwardenProviderProps) => {
  const { children } = props;
  const bitwarden = new Bitwarden();

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
