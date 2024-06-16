import { usePromise } from "@raycast/utils";
import { Application } from "@raycast/api";
import { getTerminals } from "../utils/constants";

export const useTerminals = () => {
  return usePromise(
    () => async () => {
      let _terminals: Application[] = [];
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
