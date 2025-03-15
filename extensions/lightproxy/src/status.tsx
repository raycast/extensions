import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStatus, LightproxyStatus } from "./utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<LightproxyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const result = await getStatus();
        setStatus(result);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter status items...">
      {error ? (
        <List.Item title="Error" subtitle={error} icon={{ source: Icon.Warning, tintColor: Color.Red }} />
      ) : status ? (
        <>
          <List.Item
            title="Status"
            subtitle={status.status}
            icon={{
              source: status.status === "running" ? Icon.CheckCircle : Icon.XMarkCircle,
              tintColor: status.status === "running" ? Color.Green : Color.Red,
            }}
            accessories={[{ text: status.time }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Status" content={status.status} />
              </ActionPanel>
            }
          />
          <List.Item
            title="HTTP Address"
            subtitle={status.httpAddress}
            icon={{ source: Icon.Globe }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`http://${status.httpAddress}`} />
                <Action.CopyToClipboard title="Copy Address" content={status.httpAddress} />
              </ActionPanel>
            }
          />
          <List.Item
            title="HTTPS Address"
            subtitle={status.httpsAddress}
            icon={{ source: Icon.Lock }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://${status.httpsAddress}`} />
                <Action.CopyToClipboard title="Copy Address" content={status.httpsAddress} />
              </ActionPanel>
            }
          />
          <List.Item
            title="TLD"
            subtitle={status.tld}
            icon={{ source: Icon.TextDocument }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Tld" content={status.tld} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Mappings"
            subtitle={String(status.mappings)}
            icon={{ source: Icon.List }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Mapping Count" content={String(status.mappings)} />
              </ActionPanel>
            }
          />
        </>
      ) : null}
    </List>
  );
}
