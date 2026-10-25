import { useState } from "react";
import { Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { PveServer } from "@/types";
import { usePveFetch } from "@/hooks/use-pve-fetch";
import { describeFetchError } from "@/utils/errors";
import { parseJournal } from "@/utils/journal";

const JOURNAL_LINES = 500;

export type JournalNode = { server: PveServer; node: string };

const nodeKey = ({ server, node }: JournalNode) => `${server.id}/${node}`;

type JournalProps = {
  nodes: JournalNode[];
};

export const Journal = ({ nodes }: JournalProps) => {
  const [selected, setSelected] = useState(nodeKey(nodes[0]));
  const current = nodes.find((node) => nodeKey(node) === selected) ?? nodes[0];
  const { data, isLoading, revalidate } = usePveFetch<string[]>(
    current.server,
    `api2/json/nodes/${current.node}/journal?lastentries=${JOURNAL_LINES}`,
    {
      timerInterval: 5000,
      onError: (error) => {
        showFailureToast(error, { message: describeFetchError(error) });
      },
    },
  );
  const entries = parseJournal(data ?? []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search the system log"
      searchBarAccessory={
        <List.Dropdown tooltip="Node" value={selected} onChange={setSelected}>
          {nodes.map((node) => (
            <List.Dropdown.Item
              key={nodeKey(node)}
              title={`${node.server.name} / ${node.node}`}
              value={nodeKey(node)}
            />
          ))}
        </List.Dropdown>
      }
    >
      {entries.map((entry) => (
        <List.Item
          key={entry.key}
          title={entry.message}
          keywords={[entry.unit]}
          accessories={[{ tag: entry.unit }]}
          detail={<List.Item.Detail markdown={"```\n" + entry.line + "\n```"} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Line" content={entry.line} />
              <Action
                title="Copy All Lines"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => Clipboard.copy(entries.map(({ line }) => line).join("\n"))}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
