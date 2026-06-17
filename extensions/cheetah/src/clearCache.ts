import { confirmAlert, showHUD } from "@raycast/api";
import { clearCache } from "cheetah-core";
import { errorHandle } from "./lib/utils";
import useInitCore from "./lib/effects/useInitCore";

export default async () => {
  try {
    if (
      await confirmAlert({
        title: "Sure to clear the cache?",
        message:
          "After clearing the cache, the type application configuration, the project application configuration, and the number of hits will all disappear.",
      })
    ) {
      useInitCore();
      await clearCache();
      await showHUD("Cache cleared");
    }
  } catch (error) {
    errorHandle(error);
  }
};
