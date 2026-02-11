import { State } from "@lib/haapi";
import { ActionPanel, Detail } from "@raycast/api";
import React from "react";
import { UpdateOpenInBrowserAction } from "./actions";

export function ChangelogDetail(props: { state: State }): React.ReactElement {
  const s = props.state;
  const md = s.attributes.release_summary || "";
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <UpdateOpenInBrowserAction state={s} />
        </ActionPanel>
      }
    />
  );
}
