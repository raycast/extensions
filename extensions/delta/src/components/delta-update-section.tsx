import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { isFresh, isUpdateAvailable } from "../lib/cli";
import { checkForDeltaUpdate, installDeltaUpdate } from "../lib/delta";
import { runWithToast } from "../lib/feedback";
import { DeltaUpdateCheck } from "../lib/types";

/** An "up to date" result is trusted this long, so most launches skip the release server. */
const CHECK_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * A single row announcing a newer Delta, shown above the threads. Checks in the background,
 * stays hidden when Delta is up to date or the check fails.
 */
export function DeltaUpdateSection() {
  const [saved, setSaved] = useCachedState<{ check?: DeltaUpdateCheck; checkedAt: number }>("delta-update-check");
  // A known update is checked again on every launch, so the row goes away once Delta has updated itself.
  const isUpToDate = !isUpdateAvailable(saved?.check) && isFresh(saved?.checkedAt, CHECK_MAX_AGE_MS);
  const { revalidate } = usePromise(checkForDeltaUpdate, [], {
    execute: !isUpToDate,
    onData: (check) => setSaved({ check, checkedAt: Date.now() }),
    // A failed check isn't worth interrupting the user for.
    onError: () => undefined,
  });

  const check = saved?.check;
  if (!isUpdateAvailable(check)) {
    return null;
  }

  async function install() {
    const confirmed = await confirmAlert({
      title: `Install Delta ${check?.latestVersion}?`,
      message: "Delta restarts to finish installing. Agents running in Delta stop during the restart.",
      primaryAction: { title: "Install and Restart", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) {
      return;
    }
    const installed = await runWithToast(
      { progress: "Installing Delta update", success: "Delta updated", failure: "Couldn't install the Delta update" },
      installDeltaUpdate,
    );
    if (installed) {
      revalidate();
    }
  }

  return (
    <List.Section title="Update">
      <List.Item
        title={`Delta ${check.latestVersion} Is Available`}
        subtitle={`You have ${check.currentVersion}`}
        icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Blue }}
        actions={
          <ActionPanel>
            {check.canInstall && <Action title="Install Update" icon={Icon.Download} onAction={install} />}
            <Action.OpenInBrowser
              title="View Release Notes"
              icon={Icon.Document}
              url="https://delta.dev/docs/whats-in-the-latest"
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
