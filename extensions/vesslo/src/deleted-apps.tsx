import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import {
  DataStateNotice,
  ReloadDataAction,
} from "./components/DataStateNotice";
import { auditReviewMarkdown } from "./utils/audit-warning";
import { deletedRecords } from "./utils/deleted-records";
import { countLabel, displayText } from "./utils/display-format";
import { useVessloData } from "./utils/useVessloData";

export default function DeletedApps() {
  const { data, state, isLoading, refresh } = useVessloData();
  const [query, setQuery] = useState("");
  const records = useMemo(
    () => deletedRecords(data?.apps ?? [], query),
    [data, query],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={records.length > 0}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search deleted records by name, Bundle ID, tag, memo, or path"
    >
      <DataStateNotice state={state} refresh={refresh} />
      <List.Section
        title="Deleted Records"
        subtitle={`${countLabel(records.length)} · Read-only`}
      >
        {records.map((app) => (
          <List.Item
            id={app.id}
            key={app.id}
            title={displayText(app.name)}
            icon={Icon.Trash}
            accessories={[{ text: "Deleted record" }]}
            detail={
              <List.Item.Detail
                markdown={`> This is a deleted record from Vesslo. The export does not include a deletion date or reason.\n\n${auditReviewMarkdown(app)}`}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Record">
                  {app.bundleId && (
                    <Action.CopyToClipboard
                      title="Copy Bundle ID"
                      content={app.bundleId}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Recorded Path"
                    content={app.path}
                  />
                  <ReloadDataAction refresh={refresh} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {records.length === 0 && state.status === "ready" && (
        <List.EmptyView
          title={query ? "No Matching Deleted Records" : "No Deleted Records"}
          description="Only deleted records present in the Vesslo export appear here."
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <ReloadDataAction refresh={refresh} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
