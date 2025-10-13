import { getApplications } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";

export async function isTodoistInstalled() {
  const applications = await getApplications();
  const isInstalled = applications.some((app) => app.bundleId === "com.todoist.mac.Todoist");

  return isInstalled;
}

export function useIsTodoistInstalled() {
  const { value, setValue } = useLocalStorage("isTodoistInstalled", false);

  useEffect(() => {
    async function checkApp() {
      setValue(await isTodoistInstalled());
    }

    checkApp();
  }, []);

  return value;
}
