import { useEffect, useState } from "react";
import { getApplications } from "@raycast/api";

export default function useAppExists() {
  const [state, setState] = useState({ appExistsLoading: true, appExists: false });

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((app) => app.name === "Craft"))
      .then((app) => setState({ appExistsLoading: false, appExists: app !== null }));
  }, []);

  return state;
}
