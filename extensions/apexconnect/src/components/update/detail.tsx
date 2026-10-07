import { State } from "@lib/apexapi";
import { ActionPanel, Detail } from "@raycast/api";
import { UpdateOpenInBrowserAction } from "./actions";

export function ChangelogDetail(props: { state: State }): JSX.Element {
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
