import { Action, ActionPanel, Form, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { listShares } from "../lib/smb-shares";
import { VolumeUsage } from "../lib/disk-usage";
import type { ServerEntry } from "../lib/share";
import type { MountLocation } from "../lib/mount";
import { unmountShare } from "../lib/mount";
import { errorText } from "../lib/errors";
import { DiscoveredDriveItem } from "./DiscoveredDrive";

// One-time credentials to browse any saved host's shares. Held in state only.
export function BrowseHostShares(props: {
  server: ServerEntry;
  mounted: MountLocation[];
  volumes: VolumeUsage[];
  onMountRequested: (entry: { host: string; path?: string }) => Promise<MountLocation | undefined>;
  onChanged: () => void;
  onServerAdded: () => void;
}) {
  const [credentials, setCredentials] = useState<{ user: string; password: string } | null>(null);
  const [shares, setShares] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!credentials) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listShares(props.server.host, credentials.user, credentials.password)
      .then((result) => {
        if (!cancelled) setShares(result);
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, "Couldn’t list shares on this host."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [credentials]);

  async function unmountAllOnHost() {
    const hostMounted = props.mounted.filter((m) => m.host.toLowerCase() === props.server.host.toLowerCase());
    if (!hostMounted.length) return;
    await Promise.all(
      hostMounted.map((m) => unmountShare({ host: m.host, path: m.path, protocol: m.family }).catch(() => undefined)),
    );
    props.onChanged();
  }

  if (!credentials) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Browse Shares"
              icon={Icon.MagnifyingGlass}
              onSubmit={(values: { user: string; password: string }) =>
                setCredentials({ user: values.user.trim(), password: values.password })
              }
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="user"
          title="Username"
          defaultValue={props.server.user}
          info="Prefilled from the saved drive. Used for this host only, and never stored."
        />
        <Form.PasswordField
          id="password"
          title="Password"
          placeholder="Optional on servers that allow listing"
          info="Many servers list their share names without a password. Leave this empty to try that; if the server refuses, you can enter one and try again."
        />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Shares on ${props.server.host}`}>
      {error && (
        <List.EmptyView
          title="Failed to List Shares"
          description={error}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Try Different Credentials" icon={Icon.Key} onAction={() => setCredentials(null)} />
            </ActionPanel>
          }
        />
      )}
      {shares && shares.length === 0 && !error && <List.EmptyView title="No Shares Found" icon={Icon.HardDrive} />}
      {(shares ?? []).map((vol) => (
        <DiscoveredDriveItem
          key={vol}
          vol={vol}
          host={props.server.host}
          volumes={props.volumes}
          mounted={props.mounted}
          onChanged={props.onChanged}
          onMountRequested={props.onMountRequested}
          onUnmountAll={unmountAllOnHost}
          onServerAdded={props.onServerAdded}
        />
      ))}
    </List>
  );
}
