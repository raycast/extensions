import { Action, Application, getDefaultApplication } from "@raycast/api";
import { useEffect, useState } from "react";

export function OpenManifestInDefaultAppAction(props: { url: string }) {
  const [defaultApp, setDefaultApp] = useState<Application>();
  useEffect(() => {
    getDefaultApplication(props.url)
      .then((app) => setDefaultApp(app))
      .catch(() => setDefaultApp(undefined));
  }, [props.url]);
  if (!defaultApp) {
    return null;
  }
  return (
    <Action.Open
      title={`Open Manifest in ${defaultApp.name}`}
      target={props.url}
      icon={{ fileIcon: defaultApp.path }}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "m" },
        Windows: { modifiers: ["ctrl", "shift"], key: "m" },
      }}
    />
  );
}
