import { ActionPanel, Icon } from "@raycast/api";
import type { Application } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchPages } from "../api";
import type { File } from "../types";
import { OpenPageAction } from "./OpenPageAction";

export function OpenPageSubmenuAction(props: {
  file: File;
  desktopApp: Application | undefined;
  onVisit: (file: File) => void;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const { data: pages, isLoading } = useCachedPromise((fileKey) => fetchPages(fileKey), [props.file.key], {
    execute: shouldFetch,
  });

  return (
    <ActionPanel.Submenu
      icon={Icon.Document}
      title="Open Page"
      shortcut={{ modifiers: ["cmd"], key: "g" }}
      isLoading={isLoading}
      onOpen={() => setShouldFetch(true)}
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
