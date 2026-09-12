import { ActionPanel, List, Action, closeMainWindow } from "@raycast/api";
import { execa } from "execa";
import { decode } from "html-entities";
import { DashResult } from "../types";

export default function ({ result, index }: { result: DashResult; index: number }) {
  // index is equal to `@_arg` in the raw XML structure returned by `dashAlfredWorkflow`
  const [docsetName, subtitle] = result.subtitle[2].split(" - ");

  return (
    <List.Item
      key={result["@_uid"]}
      title={decode(result.title.toString())}
      subtitle={decode(subtitle)}
      icon={result.icon}
      actions={
        <ActionPanel>
          <Action title="Open in Dash" onAction={async () => dashCallbackInBackground(index)} />
        </ActionPanel>
      }
      accessories={[
        {
          text: docsetName,
        },
      ]}
    />
  );
}

async function dashCallbackInBackground(dashIndex: number) {
  // if the workflow is not called in the background, and if a snippet is selected, the snippet will just
  // open within Dash instead of being selected for use. This adds another click for the user. By opening
  // in the background (-g) the snippet is selected immediately and the user can start to fill in placeholders
  // right away.
  await closeMainWindow({ clearRootSearch: true });
  await execa("open", ["-g", "dash-workflow-callback://" + dashIndex]);
}
