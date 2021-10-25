import { ActionPanel, List, OpenAction } from "@raycast/api";
import { DashResult } from "../util/useDocsetSearch";

export default function ({ result, index }: { result: DashResult; index: number }) {
  return (
    <List.Item
      key={result["@_uid"]}
      title={result.title}
      subtitle={result.subtitle[2]}
      icon={result.icon}
      actions={
        <ActionPanel>
          <OpenAction title="Open in Dash" target={`dash-workflow-callback://${index}`} />
        </ActionPanel>
      }
    />
  );
}
