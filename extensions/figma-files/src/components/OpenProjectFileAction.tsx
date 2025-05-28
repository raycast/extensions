import { Action, type Application } from "@raycast/api";
import type { File } from "../types";

export function OpenProjectFileAction(props: {
  file: File;
  desktopApp: Application | undefined;
  onVisit: (file: File) => void;
}) {
  return props.desktopApp ? (
    <Action.Open
      icon="command-icon.png"
      title="Open in Figma"
      target={`figma://file/${props.file.key}`}
      application={props.desktopApp}
      onOpen={() => props.onVisit(props.file)}
    />
  ) : (
    <Action.OpenInBrowser url={`https://figma.com/file/${props.file.key}`} onOpen={() => props.onVisit(props.file)} />
  );
}
