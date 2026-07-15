import { EnvProps } from "@src/types";
import { useContext } from "react";
import { EnvironmentContext } from "@src/contexts";

export const useEnvContext = (): EnvProps => {
  const context = useContext(EnvironmentContext);

  if (context === undefined) {
    throw new Error("useEnvContext was used outside of its Provider");
  }

  return context;
};
