import { Application, getApplications, Icon, OpenAction, OpenInBrowserAction } from "@raycast/api";
import { useState, useEffect } from "react";

import type { File, Node } from "../types";

export function OpenPageAction(props: { file: File; node: Node; onVisit: (file: File) => void }) {
  const [desktopApp, setDesktopApp] = useState<Application>();

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((a) => a.bundleId === "com.figma.Desktop"))
      .then(setDesktopApp);
  }, []);

  return desktopApp ? (
    <OpenAction
      title={props.node.name}
      icon={Icon.Document}
      target={`figma://file/${props.file.key}?node-id=${props.node.id}`}
      application={desktopApp}
      onOpen={() => props.onVisit(props.file)}
    />
  ) : (
    <OpenInBrowserAction
      title={props.node.name}
      url={`https://figma.com/file/${props.file.key}?node-id=${props.node.id}`}
      onOpen={() => props.onVisit(props.file)}
    />
  );
}
