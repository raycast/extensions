import { Action } from "@raycast/api";
import { useCallback } from "react";
import { useFigmaApp } from "../hooks/useFigmaApp";

import type { File } from "../types";

export function OpenProjectFileAction(props: { file: File; onVisit: (file: File) => void }) {
  const desktopApp = useCallback(() => useFigmaApp(), []);

  return desktopApp ? (
    <Action.Open
      icon="command-icon.png"
      title="Open in Figma"
      target={`figma://file/${props.file.key}`}
      application={desktopApp()}
      onOpen={() => props.onVisit(props.file)}
    />
  ) : (
    <Action.OpenInBrowser url={`https://figma.com/file/${props.file.key}`} onOpen={() => props.onVisit(props.file)} />
  );
}
