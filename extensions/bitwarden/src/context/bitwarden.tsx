import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Bitwarden } from "~/api/bitwarden";
import TroubleshootingGuide from "~/components/TroubleshootingGuide";
import { LoadingFallback } from "~/components/LoadingFallback";

const BitwardenContext = createContext<Bitwarden | null>(null);

export type BitwardenProviderProps = PropsWithChildren<{
  loadingFallback?: JSX.Element;
}>;

export const BitwardenProvider = ({ children, loadingFallback = <LoadingFallback /> }: BitwardenProviderProps) => {
  const [error, setError] = useState<any>();
  const [bitwarden, setBitwarden] = useState<Bitwarden>();

  useEffect(() => {
    new Bitwarden().initialize().then(setBitwarden).catch(setError);
  }, []);

  if (error) return <TroubleshootingGuide error={error} />;

  if (!bitwarden) return loadingFallback;

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
