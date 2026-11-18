import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useMemo } from "react";
import { EmailList } from "./components/email-list";
import { SparkNotInstalled } from "./components/states";
import { getSparkPath, isSparkInstalled, parseFolders } from "./lib/spark";

export default function Folders() {
  if (!isSparkInstalled()) return <SparkNotInstalled />;
  return <FoldersView />;
}

function FoldersView() {
  const { data, isLoading, error } = useExec(getSparkPath(), ["folders"], {
    keepPreviousData: true,
  });

  if (error) showFailureToast(error, { title: "Couldn't load folders" });

  const groups = useMemo(() => (data ? parseFolders(data) : []), [data]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter folders…">
      {groups.map((g) => (
        <List.Section key={g.group} title={g.group}>
          {g.folders.map((f) => (
            <List.Item
              key={f.id}
              icon={Icon.Folder}
              title={f.name}
              accessories={[
                { text: `${f.count.toLocaleString()}`, icon: Icon.Envelope },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Folder"
                    icon={Icon.Tray}
                    target={
                      <EmailList
                        navigationTitle={`${g.group} · ${f.name}`}
                        args={["emails", f.id]}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Folder ID"
                    content={f.id}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
