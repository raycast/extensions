import { Action, type Application, Icon } from "@raycast/api";
import type { File, Node } from "../types";

export function OpenPageAction(props: {
  file: File;
  node: Node;
  desktopApp: Application | undefined;
  onVisit: (file: File) => void;
}) {
  const { file, node, desktopApp, onVisit } = props;
  return desktopApp ? (
    <Action.Open
      title={node.name}
      icon={Icon.Document}
      target={`figma://file/${file.key}?node-id=${node.id}`}
      application={desktopApp}
      onOpen={() => onVisit(file)}
    />
  ) : (
    <Action.OpenInBrowser
      title={node.name}
      url={`https://figma.com/file/${file.key}?node-id=${node.id}`}
      onOpen={() => onVisit(file)}
    />
  );
}
