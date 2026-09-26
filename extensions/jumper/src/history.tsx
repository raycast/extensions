import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { excludeFromHistory, includeInHistory, loadHistoryState, removeFromHistory } from "./lib/load-history";
import { activateApp, type RunningApp } from "./lib/macos";

async function load() {
  const { apps, currentHidden, excluded } = await loadHistoryState();
  // Keep each app's real position for the "n back" label, then hide the current app if it's removed or excluded.
  const recent = apps.map((app, index) => ({ app, index })).filter(({ index }) => !(index === 0 && currentHidden));
  return { apps, recent, excluded };
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(load);
  const { apps = [], recent = [], excluded = [] } = data ?? {};

  async function update(change: Promise<void>, title: string) {
    try {
      await change;
    } catch (error) {
      await showFailureToast(error, { title: "Could not update history" });
      return;
    }
    revalidate();
    await showToast({ style: Toast.Style.Success, title });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent apps">
      <List.Section title="Recent">
        {recent.map(({ app, index }) => (
          <List.Item
            key={app.bundleId}
            icon={{ fileIcon: app.path }}
            title={app.name}
            accessories={index === 0 ? [{ tag: "Current" }] : [{ text: `${index} back` }]}
            actions={
              <ActionPanel>
                <SwitchAction app={app} />
                <Action
                  title="Remove from History"
                  icon={Icon.EyeDisabled}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() =>
                    update(removeFromHistory(apps, app), `Removed ${app.name} from history until used again`)
                  }
                />
                <Action
                  title="Exclude from History"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={() => update(excludeFromHistory(app), `Excluded ${app.name} from history`)}
                />
                <Action.ShowInFinder path={app.path} />
                <Action.CopyToClipboard title="Copy Bundle Identifier" content={app.bundleId} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Excluded">
        {excluded.map((app) => (
          <List.Item
            key={`excluded-${app.bundleId}`}
            icon={{ fileIcon: app.path }}
            title={app.name}
            accessories={[{ tag: "Excluded" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Include in History"
                  icon={Icon.Eye}
                  onAction={() => update(includeInHistory(app), `Included ${app.name} in history`)}
                />
                <SwitchAction app={app} />
                <Action.ShowInFinder path={app.path} />
                <Action.CopyToClipboard title="Copy Bundle Identifier" content={app.bundleId} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function SwitchAction({ app }: { app: RunningApp }) {
  return (
    <Action
      title="Switch to App"
      icon={Icon.ArrowRight}
      onAction={async () => {
        // Activate first: closing the window with Immediate unmounts this view and kills the
        // command before open() runs (ADR-009, https://github.com/mattherwig/jumper/blob/main/docs/DECISIONS.md).
        try {
          await activateApp(app);
        } catch (error) {
          await showFailureToast(error, { title: `Could not switch to ${app.name}` });
          return;
        }
        await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      }}
    />
  );
}
