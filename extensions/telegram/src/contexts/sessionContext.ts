import { createContext } from "react";

export const SessionContext = createContext<{
  setSession: (session: string) => void;
  session: string;
}>({
  setSession: () => undefined,
  session: "",
});
