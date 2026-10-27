import {
  Action,
  ActionPanel,
  Icon,
  List,
  getApplications,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { setAppMode } from "../lib/app-mode";
import { reportFailure } from "../lib/toast";
import type { AppRoutingMode } from "../lib/types";

type InstalledApp = { name: string; bundleId: string };

/**
 * Picking an installed app beats typing `com.tinyspeck.slackmacgap`. The
 * frontmost app is preselected so the common case is Enter.
 */
export function AppPicker({
  appsEnabled,
  frontmostBundleId,
  onDone,
}: {
  appsEnabled: boolean;
  frontmostBundleId?: string;
  onDone?: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  const { data, isLoading } = usePromise(async () => {
    const apps = await getApplications();
    return apps
      .filter((app) => Boolean(app.bundleId))
      .map((app) => ({ name: app.name, bundleId: app.bundleId as string }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Add App Rule"
      searchBarPlaceholder="Search installed apps…"
      selectedItemId={frontmostBundleId}
    >
      {(data ?? []).map((app) => (
        <List.Item
          key={app.bundleId}
          id={app.bundleId}
          icon={Icon.AppWindow}
          title={app.name}
          subtitle={app.bundleId}
          actions={
            <PickActions
              app={app}
              appsEnabled={appsEnabled}
              onDone={async () => {
                pop();
                await onDone?.();
              }}
            />
          }
        />
      ))}
      {!isLoading && (data ?? []).length === 0 ? (
        <List.EmptyView icon={Icon.AppWindow} title="No applications found" />
      ) : null}
    </List>
  );
}

function PickActions({
  app,
  appsEnabled,
  onDone,
}: {
  app: InstalledApp;
  appsEnabled: boolean;
  onDone: () => void | Promise<void>;
}) {
  async function apply(mode: AppRoutingMode) {
    try {
      await showHUD(await setAppMode(app, mode, { appsEnabled }));
      await onDone();
    } catch (error) {
      await reportFailure(error, `Couldn't add a rule for ${app.name}`);
    }
  }

  return (
    <ActionPanel>
      <Action title="Route Through the Tunnel" icon={Icon.Bolt} onAction={() => apply("TUNNEL")} />
      <ActionPanel.Section>
        <Action title="Use Targets" icon={Icon.List} onAction={() => apply("TARGETS")} />
        <Action title="Direct" icon={Icon.Circle} onAction={() => apply("DIRECT")} />
        <Action.CopyToClipboard title="Copy Bundle Identifier" content={app.bundleId} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
