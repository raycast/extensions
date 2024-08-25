import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OnboardingHookType } from "../type/onboarding";

export function useOnboarding(): OnboardingHookType {
  const [data, setData] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(true);

  const localStorageName = "onboarding";

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(localStorageName);
      const d = stored === "true";
      setData(d);

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      LocalStorage.setItem(localStorageName, JSON.stringify(data));
    }
  }, [data, isLoading]);

  const finish = useCallback(async () => {
    await setData(true);

    await showToast({
      title: "Onboarding finished!",
      style: Toast.Style.Success,
    });
  }, [setData, data]);

  return useMemo(() => ({ data, isLoading, finish }), [data, isLoading, finish]);
}
