import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  frpDirExists,
  getConfigPath,
  getPrefs,
  loadProxyItems,
  type ProxyViewItem,
} from "./frp";
import { MissingFrpDir } from "./components";

export default function Command() {
  const prefs = getPrefs();
  const { data, isLoading, error, revalidate } =
    useCachedPromise(loadProxyItems);
  const configPath = getConfigPath(prefs.frpDir);

  if (!frpDirExists()) {
    return (
      <List>
        <MissingFrpDir frpDir={prefs.frpDir} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter proxies">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load proxies"
          description={`${error.message}\nExpected config: ${configPath}`}
        />
      ) : null}
      {!error && (data ?? []).length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Network}
          title="No proxies configured"
          description={`Add [[proxies]] entries to ${configPath}`}
          actions={
            <ActionPanel>
              <Action
                title="Open Config in Editor"
                icon={Icon.Pencil}
                onAction={() => open(configPath)}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {(data ?? []).map((item) => (
        <List.Item
          key={item.config.name}
          title={item.config.name}
          subtitle={`${item.localAddress} → ${item.remoteAddress}`}
          icon={proxyIcon(item)}
          accessories={proxyAccessories(item)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title={
                  item.visitor ? "Copy Local Address" : "Copy Remote Address"
                }
                content={item.visitor ? item.localAddress : item.remoteAddress}
              />
              {showSsh(item) ? (
                <Action.CopyToClipboard
                  title="Copy SSH Command"
                  content={sshCommand(item)}
                />
              ) : null}
              <Action
                title="Open Config in Editor"
                icon={Icon.Pencil}
                onAction={() => open(configPath)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function showSsh(item: ProxyViewItem): boolean {
  return (
    item.config.remotePort !== undefined &&
    (item.config.name === "ssh" || item.config.localPort === 22)
  );
}

function sshCommand(item: ProxyViewItem): string {
  const user = process.env.USER ?? "user";
  return `ssh -p ${item.config.remotePort} ${user}@${item.serverAddr}`;
}

function proxyIcon(item: ProxyViewItem) {
  if (item.visitor) {
    // Visitors have no runtime status in the admin API; render neutral.
    return { source: Icon.ArrowRightCircle, tintColor: Color.Blue };
  }
  if (item.statusUnavailable) {
    return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  }
  if (item.runtime?.status === "running") {
    return { source: Icon.CircleFilled, tintColor: Color.Green };
  }
  return { source: Icon.XMarkCircle, tintColor: Color.Red };
}

function proxyAccessories(item: ProxyViewItem) {
  const accessories: {
    tag?: { value: string; color: Color };
    text?: string;
  }[] = [{ text: item.config.type }, { text: item.remoteAddress }];
  if (item.visitor) {
    accessories.unshift({
      tag: { value: "visitor", color: Color.Blue },
    });
    return accessories;
  }
  if (item.statusUnavailable) {
    accessories.unshift({
      tag: { value: "status unavailable", color: Color.SecondaryText },
    });
    return accessories;
  }
  const status = item.runtime?.status ?? "unknown";
  const err = item.runtime?.err;
  accessories.unshift({
    tag: {
      value: err ? `${status}: ${err}` : status,
      color: status === "running" ? Color.Green : Color.Red,
    },
  });
  return accessories;
}
