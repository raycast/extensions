import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { List, ActionPanel, Action, Icon, closeMainWindow, PopToRootType, Color, Image, Detail } from "@raycast/api";
import { getFavicon, showFailureToast } from "@raycast/utils";
import type { Host } from "./types";
import { withBrowser, useBrowser } from "./lib/withBrowser";
import { useCachedHosts } from "./hooks/useCachedHosts";
import { useDebouncedQuery } from "./hooks/useDebouncedQuery";

export const Switch: FC = () => {
  const browser = useBrowser();
  const { hosts, addHost, deleteHost } = useCachedHosts();
  const { query, filter, setQuery } = useDebouncedQuery();
  const [currentHost, setCurrentHost] = useState<string | undefined>();
  const isLoading = !currentHost;
  const [error, setError] = useState<Error>();

  const filteredHosts = useMemo(
    () =>
      Object.keys(hosts)
        .filter((h) => !currentHost?.startsWith(h) && h.includes(query))
        .map((h) => hosts[h]),
    [hosts, filter, currentHost],
  );

  useEffect(() => {
    if (browser) {
      browser
        .getCurrentTabUrl()
        .then((url) => {
          if (url) {
            const currentUrl = new URL(url);
            const host =
              currentUrl.protocol + "//" + currentUrl.hostname + (currentUrl.port ? `:${currentUrl.port}` : "");

            setCurrentHost(host);

            if (!hosts[host]) {
              addHost(host);
            }
          }
        })
        .catch((err) => {
          setError(err);
          showFailureToast(err);
        });
    }
  }, [browser]);

  const switchHost = async (host: Host) => {
    if (browser) {
      if (!hosts[host.host]) {
        addHost(host.host);
      }
      await browser.switch(host.host);
      await browser.getCurrentTabUrl().then((host) => setCurrentHost(host));
      setQuery("");
      await closeMainWindow({
        popToRootType: PopToRootType.Immediate,
        clearRootSearch: true,
      });
    }
  };

  if (error) return <Detail markdown={`# ERROR \n\n ${error.message}`} />;

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

export interface HostItemProps {
  host: Host;
  onSwitch: (host: Host) => Promise<void>;
  onDelete?: (host: Host) => void;
}

export const HostItem = ({ host, onSwitch, onDelete }: HostItemProps) => {
  const browser = useBrowser();
  const switchHost = useCallback(() => onSwitch(host), [host]);
  const deleteAction = useCallback(() => onDelete && onDelete(host), [host]);
  const openInNewTab = useCallback(async () => {
    await browser.openUrl(host.host);
    await closeMainWindow({
      popToRootType: PopToRootType.Immediate,
      clearRootSearch: true,
    });
  }, [host]);

  return (
    <List.Item
      title={host.host}
      icon={
        host.isLocal
          ? Icon.Link
          : getFavicon(host.host, {
              mask: Image.Mask.RoundedRectangle,
            })
      }
      accessories={[
        { text: host.isLocal ? { value: "local", color: Color.Yellow } : { value: "remote", color: Color.Blue } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Switch Host" icon={Icon.Switch} onAction={switchHost} />
            <Action title="Open in New Tab" icon={Icon.Plus} onAction={openInNewTab} />
            {onDelete && <Action title="Delete Host" icon={Icon.Trash} onAction={deleteAction} />}
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

export default withBrowser(Switch);
