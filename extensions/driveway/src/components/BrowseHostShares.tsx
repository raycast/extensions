import { Action, ActionPanel, Form, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { listShares } from "../lib/smb-shares";
import { sameHost } from "../lib/share";
import type { ServerEntry } from "../lib/share";
import { unmountMountPoint } from "../lib/mount";
import { useMountStatus } from "../hooks/useMountStatus";
import { errorText } from "../lib/errors";
import { refreshMenuBar } from "../lib/menu-bar-cache";
import { DiscoveredDriveItem } from "./DiscoveredDrive";

// One-time credentials to browse any saved host's shares. Held in state only.
export function BrowseHostShares(props: { server: ServerEntry; onChanged: () => void; onServerAdded: () => void }) {
  const [credentials, setCredentials] = useState<{ user: string; password: string } | null>(null);
  const [shares, setShares] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mount status is read here rather than handed down. push() takes an element,
  // so whatever the caller passed is frozen at that moment: mounting a share
  // from this view updated the caller's state, and this view went on showing
  // the drive as disconnected, with no Unmount action, no usage and a grey icon.
  const { mounted, volumes, refreshMounted, pollUntilMounted } = useMountStatus();

  useEffect(() => {
    refreshMounted();
  }, []);

  // Both halves matter: this view redraws, and the caller behind it re-reads,
  // so popping back doesn't land on a stale list.
  async function handleChanged() {
    await refreshMounted();
    props.onChanged();
  }

  async function handleMountRequested(entry: { host: string; path?: string }) {
    const match = await pollUntilMounted(entry);
    props.onChanged();
    return match;
  }

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
    const hostMounted = mounted.filter((m) => sameHost(m.host, props.server.host));
    if (!hostMounted.length) return;
    await Promise.all(
      // By mount point: two copies of one share would otherwise both resolve
      // to the first, leaving the second mounted.
      hostMounted.map((m) => unmountMountPoint(m.mountPoint).catch(() => undefined)),
    );
    await handleChanged();
    await refreshMenuBar();
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
          volumes={volumes}
          mounted={mounted}
          onChanged={handleChanged}
          onMountRequested={handleMountRequested}
          onUnmountAll={unmountAllOnHost}
          onServerAdded={props.onServerAdded}
        />
      ))}
    </List>
  );
}
