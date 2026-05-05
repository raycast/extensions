import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { getSSHKeys } from "./util";

export default function Command() {
  const { data = [], isLoading } = usePromise(getSSHKeys, [], {
    failureToastOptions: {
      title: "Failed to load SSH keys",
    },
  });

  return (
    <List isLoading={isLoading}>
      <List.Section title="SSH Keys" subtitle={data.length.toString()}>
        {data.map((file) => {
          return (
            <List.Item
              icon={Icon.Key}
              key={file.title}
              title={file.title}
              subtitle={file.path}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy SSH Key" content={file.readFile()} />
                  <Action.ShowInFinder path={file.path} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
