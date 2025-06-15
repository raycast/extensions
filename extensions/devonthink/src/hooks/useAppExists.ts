import { useEffect, useState } from "react";
import { getApplications, open, showToast, Toast } from "@raycast/api";

export type UseAppExists = {
  appExistsLoading: boolean;
  appExists: boolean;
  appName: string;
};

const useAppExists = () => {
  const names = ["DEVONthink", "DEVONthink 3"];
  const [state, setState] = useState<UseAppExists>({ appExistsLoading: true, appExists: false, appName: "" });

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((app) => names.find((devonName) => app.name === devonName)))
      .then((app) => setState({ appExistsLoading: false, appExists: app !== undefined, appName: app?.name ?? "" }));
  }, []);

  useEffect(() => {
    if (state.appExistsLoading) return;
    if (state.appExists) return;

    showToast({
      style: Toast.Style.Failure,
      title: "DEVONthink is not installed",
      primaryAction: {
        title: "Download app",
        onAction: (toast) => open("https://www.devontechnologies.com/apps/devonthink").then(() => toast.hide()),
      },
    });
  }, [state.appExistsLoading, state.appExists]);

  return state;
};

export default useAppExists;
