import { Action, ActionPanel, confirmAlert, Detail, Icon, List, LocalStorage, open } from "@raycast/api";
import { useEffect, useState } from "react";

const storageKey = "$update-modal$last-opened";
const releaseDate = new Date("2022-04-03T00:00:00");

export function UpdatesModal({ children }: { children: JSX.Element }) {
  const [lastOpened, setLastOpened] = useState<Date>();

  useEffect(() => {
    LocalStorage.getItem(storageKey).then((item) =>
      setLastOpened(item ? new Date(parseInt(item as string)) : new Date(0))
    );
  }, []);

  if (!lastOpened) {
    return <Detail isLoading={true} />;
  }

  if (releaseDate.getTime() < lastOpened.getTime()) {
    return children;
  }

  return (
    <List>
      <List.EmptyView
        icon={Icon.Hammer}
        actions={
          <ActionPanel>
            <Action
              title="Open README"
              onAction={() => {
                confirmAlert({ title: "Do you want to validate the permission scopes now?" }).then((confirmed) => {
                  if (confirmed) {
                    open("https://www.raycast.com/mommertf/slack#readme");

                    const now = new Date();
                    setLastOpened(now);
                    LocalStorage.setItem(storageKey, `${now.getTime()}`);
                  }
                });
              }}
            />
          </ActionPanel>
        }
        title="Action required"
        description="Due to extension updates, you need to check your Slack Api permission scopes to validate that all necessary permissions are granted. Please check out the README for the required scopes."
      />
    </List>
  );
}
