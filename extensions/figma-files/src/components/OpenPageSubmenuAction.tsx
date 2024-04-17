import { ActionPanel, Icon } from "@raycast/api";
import { Application } from "@raycast/api";

import { File } from "../types";
import { OpenPageAction } from "./OpenPageAction";
import { useCachedPromise } from "@raycast/utils";
import { fetchPages } from "../api";

export function OpenPageSubmenuAction(props: {
  file: File;
  desktopApp: Application | undefined;
  onVisit: (file: File) => void;
}) {
  const { data: pages, isLoading } = useCachedPromise((fileKey) => fetchPages(fileKey), [props.file.key]);

  return (
    <ActionPanel.Submenu
      icon={Icon.Document}
      title="Open Page"
      shortcut={{ modifiers: ["cmd"], key: "g" }}
      isLoading={isLoading}
    >
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
