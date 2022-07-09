import { useContext } from "react";
import { AppContext } from "../contexts/AppContext";

export function useApp() {
  return useContext(AppContext);
}
