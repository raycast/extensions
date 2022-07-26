import { Application, getApplications, Action } from "@raycast/api";
import { useState, useEffect } from "react";

import type { File } from "../types";

export function OpenProjectFileAction(props: { file: File; onVisit: (file: File) => void }) {
  const [desktopApp, setDesktopApp] = useState<Application>();

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((a) => a.bundleId === "com.figma.Desktop"))
      .then(setDesktopApp);
  }, []);

  return desktopApp ? (
    <Action.Open
      icon="command-icon.png"
      title="Open in Figma"
      target={`figma://file/${props.file.key}`}
      application={desktopApp}
      onOpen={() => props.onVisit(props.file)}
    />
  ) : (
    <Action.OpenInBrowser url={`https://figma.com/file/${props.file.key}`} onOpen={() => props.onVisit(props.file)} />
  );
}
