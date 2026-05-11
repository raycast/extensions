import React from "react";
import { List, ActionPanel, Action, Form, useNavigation, showToast, Toast, open, Icon } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { updateHostsFile, getCurrentlyBlockedHosts } from "./hosts-file";
import { getStoredHosts, addHostToStorage, removeHostFromStorage } from "./storage";

export default function Command() {
  const [searchText, setSearchText] = React.useState("");

  const storedHosts = usePromise(getStoredHosts);

  const currentBlocked = usePromise(getCurrentlyBlockedHosts);
  const blockingEnabled = currentBlocked.data && currentBlocked.data.length > 0;

  async function sync() {
    if (!storedHosts.data) return;
    try {
      await updateHostsFile(storedHosts.data);
      await open("raycast://"); // Password prompt causes Raycast to close, so we reopen it here
      currentBlocked.revalidate().catch(() => {});
      showToast({ title: "Successfully updated hosts file", style: Toast.Style.Success });
    } catch (e) {
      console.error(e);
      showToast({ title: "Something went wrong while updating hosts file", style: Toast.Style.Failure });
    }
  }

  async function addHostFromSearch() {
    try {
      await addHostToStorage(searchText);
      setSearchText("");
      storedHosts.revalidate().catch(() => {});
    } catch (e) {
      console.error(e);
      if (e instanceof Error) showToast({ title: e.message, style: Toast.Style.Failure });
    }
  }

  async function removeHost(host: string) {
    try {
      await removeHostFromStorage(host);
      setSearchText("");
      storedHosts.revalidate().catch(() => {});
    } catch (e) {
      console.error(e);
      if (e instanceof Error) showToast({ title: e.message, style: Toast.Style.Failure });
    }
  }

  return (
    <List
      isLoading={storedHosts.isLoading || currentBlocked.isLoading}
      searchText={searchText}
      filtering
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or add a new host (e.g.: news.ycombinator.com)"
      actions={
        <ActionPanel>
          <Action
            title="Add New Host"
            icon={Icon.NewDocument}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={addHostFromSearch}
          />
        </ActionPanel>
      }
    >
      {(storedHosts.data || []).map((host) => (
        <List.Item
          key={host}
          icon={getFavicon("https://" + host)}
          title={host}
          accessories={!blockingEnabled || currentBlocked.data?.includes(host) ? [] : [{ text: "🔄 Needs Sync" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Host"
                icon={Icon.NewDocument}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<AddHostView onAdded={() => storedHosts.revalidate().catch(() => {})} />}
              />
              <Action
                title="Remove Host"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                icon={Icon.Trash}
                onAction={() => removeHost(host)}
              />
              {blockingEnabled && <Action title="Sync All" icon={Icon.RotateClockwise} onAction={sync} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const AddHostView: React.FC<{ onAdded: () => void }> = ({ onAdded }) => {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Host"
            onSubmit={async (values: { host: string }) => {
              try {
                await addHostToStorage(values.host);
                onAdded();
                pop();
              } catch (e) {
                console.error(e);
                if (e instanceof Error) showToast({ title: e.message, style: Toast.Style.Failure });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="host" title="Host name" placeholder="news.ycombinator.com" />
    </Form>
  );
};
