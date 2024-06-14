import { ActionPanel, List, Action } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect } from "react";

import { getSSHKeys } from "./util";

export default function Command() {
  const { data, isLoading, error } = usePromise(getSSHKeys);

  useEffect(() => {
    if (error) {
      showFailureToast(error, {
        title: "Failed to load SSH keys",
      });
    }
  }, [error]);

  return (
    <List isLoading={isLoading}>
      <List.Section title="SSH Keys">
        {(data || []).map((file) => {
          return (
            <List.Item
              icon="list-icon.png"
              key={file.title}
              title={file.title}
              subtitle={file.path}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy SSH Key" content={file.readFile()} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
