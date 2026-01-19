import { Action, ActionPanel, Detail } from "@raycast/api";

import { useGetSheet } from "../hooks";
import { urlFor } from "../utils";
import type { SheetProps } from "../types";

export function SheetView(props: SheetProps) {
  const { isLoading, data: sheet } = useGetSheet(props.slug);

  return (
    <Detail
      navigationTitle={`Cheatsheet: ${props.slug}`}
      isLoading={isLoading}
      markdown={sheet}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={urlFor(props.slug)} />
        </ActionPanel>
      }
    />
  );
}
