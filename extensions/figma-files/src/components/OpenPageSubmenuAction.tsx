import { ActionPanel, Icon } from "@raycast/api";
import { usePages } from "../hooks/usePages";
import { Application } from "@raycast/api";

import { File } from "../types";
import { OpenPageAction } from "./OpenPageAction";

export function OpenPageSubmenuAction(props: {
  file: File;
  desktopApp: Application | undefined;
  onVisit: (file: File) => void;
}) {
  const pages = usePages(props.file);

  return (
    <ActionPanel.Submenu icon={Icon.Document} title="Open Page" shortcut={{ modifiers: ["cmd"], key: "g" }}>
      {pages?.map((p) => (
        <OpenPageAction
          key={p.id}
          file={props.file}
          desktopApp={props.desktopApp}
          node={p}
          onVisit={() => props.onVisit(props.file)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
