import { useBase } from "./base";
import { getProjects } from "../utils";

export function useProjects() {
  const result = useBase({
    handler: getProjects,
    toasts: {
      error: (err) => ({
        title: "Failed fetching projects!",
        message: err.message,
      }),
    },
  });

  return result;
}
