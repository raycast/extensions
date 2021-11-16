import { ActionPanel, List, OpenAction } from "@raycast/api";
import { decode } from "html-entities";
import { DashResult } from "../util/useDocsetSearch";

export default function ({ result, index }: { result: DashResult; index: number }) {
  const [docsetName, subtitle] = result.subtitle[2].split(" - ");
  return (
    <List.Item
      key={result["@_uid"]}
      title={decode(result.title.toString())}
      subtitle={decode(subtitle)}
      accessoryTitle={docsetName}
      icon={result.icon}
      actions={
        <ActionPanel>
          <OpenAction title="Open in Dash" target={`dash-workflow-callback://${index}`} />
        </ActionPanel>
      }
    />
  );
}
