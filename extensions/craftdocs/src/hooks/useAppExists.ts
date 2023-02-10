import { useEffect, useState } from "react";
import { getApplications } from "@raycast/api";

export type UseAppExists = {
  appExistsLoading: boolean;
  appExists: boolean;
};

export default function useAppExists() {
  const [state, setState] = useState<UseAppExists>({ appExistsLoading: true, appExists: false });

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((app) => app.name === "Craft"))
      .then((app) => setState({ appExistsLoading: false, appExists: app !== undefined }));
  }, []);

  return state;
}
