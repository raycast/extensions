import { createContext, useContext } from "react";

import { PopiconVariant } from "../../enums/popicon-variant";

type PopiconGridContextValue = {
  variant: PopiconVariant;
};

const PopiconGridContext = createContext<PopiconGridContextValue | null>(null);

function usePopiconGridContext(componentName?: string) {
  const context = useContext(PopiconGridContext);

  if (context === null) {
    throw new Error(`${componentName ?? "usePopiconGridContext"} must be used within a PopiconGrid`);
  }

  return context;
}

export { PopiconGridContext, usePopiconGridContext };
