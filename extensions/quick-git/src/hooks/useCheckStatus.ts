import { createContext, useContext } from "react";

export const CheckStatusContext = createContext<() => void>(() => {
  throw Error("Cannot check status: CheckStatusContext was not initialized");
});

export function useCheckStatus() {
  return useContext(CheckStatusContext);
}
