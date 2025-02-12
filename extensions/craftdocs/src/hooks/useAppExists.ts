import { useEffect, useState } from "react";
import { getApplications } from "@raycast/api";
import { bundleIds, getPreferences } from "../preferences";

export type UseAppExists = {
  appExistsLoading: boolean;
  appExists: boolean;
};

export default function useAppExists() {
  const [state, setState] = useState<UseAppExists>({ appExistsLoading: true, appExists: false });

  useEffect(() => {
    const check = async () => {
      const apps = await getApplications();
      const preferredApp = getPreferences().application;
      const found = apps.find((app) => app.bundleId && bundleIds.includes(app.bundleId as typeof bundleIds[number]));
      const app = preferredApp || found;

      if (!app) {
        return setState({ appExistsLoading: false, appExists: false });
      }

      setState({ appExistsLoading: false, appExists: true });
    };

    check();
  }, []);

  return state;
}
