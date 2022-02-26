import { ActionPanel, Icon } from "@raycast/api";
import { usePages } from "../hooks/usePages";

import { File } from "../types";
import { OpenPageAction } from "./OpenPageAction";

export function OpenPageSubmenuAction(props: { file: File; onVisit: (file: File) => void }) {
  const pages = usePages(props.file);

  return (
    <ActionPanel.Submenu icon={Icon.Document} title="Open Page" shortcut={{ modifiers: ["cmd"], key: "p" }}>
      {pages?.map((p) => (
        <OpenPageAction key={p.id} file={props.file} node={p} onVisit={() => props.onVisit(props.file)} />
      ))}
    </ActionPanel.Submenu>
  );
}
