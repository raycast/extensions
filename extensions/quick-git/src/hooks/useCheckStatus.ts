import { createContext, useContext } from "react";

export const CheckStatusContext = createContext(() => {
  console.error("Cannot check status: no function was passed into to context");
});

export function useCheckStatus() {
  return useContext(CheckStatusContext);
}
