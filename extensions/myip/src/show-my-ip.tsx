import { Action, ActionPanel, Detail, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatIpLines, getCopyActions, getLocalIPv4, getPublicIPv4, type LocalIPv4 } from "./ip";

interface IpSnapshot {
  local: LocalIPv4[];
  publicIp: string | null;
  publicError: string | null;
}

export default function ShowMyIp() {
  const [snapshot, setSnapshot] = useState<IpSnapshot>();
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    async function load() {
      const local = getLocalIPv4();
      let publicIp: string | null = null;
      let publicError: string | null = null;

      try {
        publicIp = await getPublicIPv4();
      } catch (error) {
        publicError = error instanceof Error ? error.message : String(error);
      }

      if (cancelled) {
        return;
      }

      setSnapshot({ local, publicIp, publicError });
      setIsLoading(false);

      if (publicError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch external IP",
          message: publicError.length > 180 ? `${publicError.slice(0, 177)}…` : publicError,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const lines = snapshot ? formatIpLines(snapshot.local, snapshot.publicIp) : null;
  const markdown =
    isLoading || !lines
      ? "Fetching IP addresses…"
      : lines.map((line) => line.replace(/^([^:]+):/, "**$1**:")).join("\n\n");

  const localText = snapshot?.local.map((item) => item.address).join(", ") ?? "";
  const copyActions = snapshot ? getCopyActions(localText, snapshot.publicIp) : [];
  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => setReloadToken((value) => value + 1)}
    />
  );

  return (
    <Detail
      navigationTitle="My IP"
      markdown={markdown}
      actions={
        <ActionPanel>
          {snapshot && !snapshot.publicIp ? <ActionPanel.Section>{refreshAction}</ActionPanel.Section> : null}
          <ActionPanel.Section title="Copy">
            {copyActions.map((action) => (
              <Action.CopyToClipboard key={action.target} title={action.title} content={action.content} />
            ))}
          </ActionPanel.Section>
          {!snapshot || snapshot.publicIp ? <ActionPanel.Section>{refreshAction}</ActionPanel.Section> : null}
        </ActionPanel>
      }
    />
  );
}
