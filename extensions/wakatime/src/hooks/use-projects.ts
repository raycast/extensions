import { useCallback } from "react";

import { useBase } from "./base";
import { getProjects } from "../utils";

export function useProjects() {
  const result = useBase({
    handler: useCallback(getProjects, []),
    toasts: {
      error: (err) => ({
        title: "Failed fetching projects!",
        message: err.message,
      }),
    },
  });

  return result;
}
