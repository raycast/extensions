import { useBase } from "./base";
import { getUser } from "../utils";

export function useUser() {
  const result = useBase({
    handler: getUser,
    toasts: {
      loading: { title: "Loading..." },
      success: { title: "Done!!" },
      error: (err) => ({
        title: "Failed fetching data!",
        message: err.message,
      }),
    },
  });

  return result;
}
