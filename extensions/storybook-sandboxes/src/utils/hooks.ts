import { getApplications, getDefaultApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";

const KNOWN_TERMINALS = ["Warp", "iTerm2", "Hyper", "Terminal"];

export const useTerminals = () => {
  const { data } = usePromise(async () => {
    const allApps = await getApplications();
    const terminals = allApps.filter(
      (app) => KNOWN_TERMINALS.includes(app.name) && !app.bundleId?.includes("com.parallels")
    );
    console.log("Installed terminals:", terminals);
    return terminals;
  });

  return data;
};

export const useDefaultEditor = () => {
  const { data } = usePromise(async () => {
    const defaultJSEditor = await getDefaultApplication(__filename);
    console.log("Default JavaScript editor:", defaultJSEditor);
    return defaultJSEditor;
  });

  return data;
};
