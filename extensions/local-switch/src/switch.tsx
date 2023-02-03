import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { List, ActionPanel, Action, Icon, Toast, showToast, closeMainWindow, PopToRootType, Color } from "@raycast/api";
import type { Host } from "./types";
import { type WithBrowser, withBrowser } from "./lib/withBrowser";
import { useCachedHosts } from "./hooks/useCachedHosts";
import { useDebouncedQuery } from "./hooks/useDebouncedQuery";

export const Switch: FC<WithBrowser> = ({ browser }) => {
  const { hosts, addHost, deleteHost } = useCachedHosts();
  const { query, filter, setQuery } = useDebouncedQuery();
  const [currentHost, setCurrentHost] = useState<string | undefined>();
  const isLoading = !currentHost;

  const filteredHosts = useMemo(
    () =>
      Object.keys(hosts)
        .filter((h) => !currentHost?.startsWith(h) && h.includes(query))
        .map((h) => hosts[h]),
    [hosts, filter, currentHost]
  );

  useEffect(() => {
    browser &&
      browser.getCurrentTabUrl().then((url) => {
        if (url) {
          const currentUrl = new URL(url);
          const host =
            currentUrl.protocol + "//" + currentUrl.hostname + (currentUrl.port ? `:${currentUrl.port}` : "");

          setCurrentHost(host);

          if (!hosts[host]) {
            addHost(host);
          }
        }
      });
  }, [browser]);

  const switchHost = async (host: Host) => {
    if (browser) {
      if (!hosts[host.host]) {
        addHost(host.host);
      }
      await showToast({
        title: "Switching...",
        style: Toast.Style.Animated,
      });
      await browser.switch(host.host);
      await showToast({
        title: "Done!",
        style: Toast.Style.Success,
      });
      await browser.getCurrentTabUrl().then((host) => setCurrentHost(host));
      setQuery("");
      await closeMainWindow({
        popToRootType: PopToRootType.Immediate,
        clearRootSearch: true,
      });
    }
  };

  return (
    <List searchBarPlaceholder="Host Url" isLoading={isLoading} searchText={query} onSearchTextChange={setQuery}>
      {filteredHosts.length !== 0 ? (
        currentHost &&
        filteredHosts.map((host) => (
          <HostItem key={host.host} host={host} onSwitch={switchHost} onDelete={deleteHost} />
        ))
      ) : query ? (
        <NewHostItem host={query} onSwitch={switchHost} />
      ) : (
        <List.EmptyView title="No recent hosts" description="Start by entering host url in search bar" />
      )}
    </List>
  );
};

export default withBrowser(Switch);

export interface HostItemProps {
  host: Host;
  onSwitch: (host: Host) => Promise<void>;
  onDelete?: (host: Host) => void;
}

export const HostItem = ({ host, onSwitch, onDelete }: HostItemProps) => {
  const switchHost = useCallback(() => onSwitch(host), [host]);
  const deleteAction = useCallback(() => onDelete && onDelete(host), [host]);

  return (
    <List.Item
      title={host.host}
      icon={Icon.Globe}
      accessories={[
        { icon: `${host.host}/favicon.ico` },
        { text: host.isLocal ? { value: "local", color: Color.Yellow } : { value: "remote", color: Color.Blue } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title={`Switch to ${host.host}`} icon={Icon.Switch} onAction={switchHost} />
            {onDelete && <Action title="Delete" icon={Icon.Trash} onAction={deleteAction} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export interface NewHostItemProps extends Pick<HostItemProps, "onSwitch"> {
  host: string;
}

export const NewHostItem = ({ host, onSwitch }: NewHostItemProps) => {
  const isLocal = host.includes("localhost");
  const newHost = {
    host: host.startsWith("http") ? host : (isLocal ? "http://" : "https://") + host,
    isLocal,
  };
  return <HostItem host={newHost} onSwitch={() => onSwitch(newHost)} />;
};
