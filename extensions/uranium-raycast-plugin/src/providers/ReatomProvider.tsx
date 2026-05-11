import { ReactNode } from "react";
import { createCtx } from "@reatom/framework";
import { reatomContext } from "@reatom/npm-react";

const ctx = createCtx();

interface ReatomProviderProps {
  children: ReactNode;
}

export function ReatomProvider({ children }: ReatomProviderProps) {
  return <reatomContext.Provider value={ctx}>{children}</reatomContext.Provider>;
}
