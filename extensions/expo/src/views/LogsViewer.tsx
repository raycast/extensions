import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchLogs } from "../lib/log/fetchLogs";
import { changeCase } from "../lib/utils";
import { generateLogsMarkdown } from "../lib/markdown/generateLogsMarkdown";

export default function LogsViewer({ logFiles }: { logFiles: string[] }) {
  const { isLoading, data } = usePromise(async () => {
    const response = await fetchLogs(logFiles);

    return response;
  });

  return (
    <List isLoading={isLoading} navigationTitle="Logs" isShowingDetail>
      {data && data.length > 0 ? (
        <>
          {data.map((group) => (
            <List.Item
              id={group[0]}
              key={group[0]}
              title={changeCase(group[0].replaceAll("_", " "), "sentence")}
              icon={Icon.ChevronRight}
              detail={<List.Item.Detail markdown={generateLogsMarkdown(group[1])} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Logs" content={group[1].map((log) => log.msg).join("\n\n")} />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView title="No logs found" />
      )}
    </List>
  );
}
