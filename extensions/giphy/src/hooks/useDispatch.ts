import { useContext } from "react";
import { AppDispatchContext } from "../contexts/AppContext";

export function useDispatch() {
  return useContext(AppDispatchContext);
}
