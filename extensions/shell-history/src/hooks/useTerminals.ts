import { usePromise } from "@raycast/utils";
import { getTerminals } from "../utils/constants";
import { Terminal } from "../types/types";

export const useTerminals = () => {
  return usePromise(
    () => async () => {
      let _terminals: Terminal[] = [];
      try {
        _terminals = await getTerminals();
      } catch (e) {
        console.error(String(e));
      }
      return { data: _terminals };
    },
    [],
  );
};
