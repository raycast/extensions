import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { primaryAppMode, removeAppRuleFor, setAppMode, type AppModeTarget } from "../lib/app-mode";
import * as api from "../lib/api";
import { confirmDestructive, reportFailure } from "../lib/toast";
import type { AppRoutingMode } from "../lib/types";

type Done = () => void | Promise<void>;

function useAppActions(app: AppModeTarget, onDone?: Done) {
  async function apply(mode: AppRoutingMode) {
    try {
      const message = await setAppMode(app, mode, { appsEnabled: app.appsEnabled });
      await showHUD(message);
      await onDone?.();
    } catch (error) {
      await reportFailure(error, `Couldn't change ${app.name}'s mode`);
    }
  }

  async function enablePerAppRouting() {
    try {
      await api.setAppsEnabled(true);
      await showHUD("Per-app routing on");
      await onDone?.();
    } catch (error) {
      await reportFailure(error, "Couldn't turn on per-app routing");
    }
  }

  async function removeRule() {
    const confirmed = await confirmDestructive({
      title: `Remove the rule for ${app.name}?`,
      message: "The app follows the default mode again.",
      actionTitle: "Remove Rule",
    });
    if (!confirmed) return;
    try {
      await showHUD(await removeAppRuleFor(app));
      await onDone?.();
    } catch (error) {
      await reportFailure(error, "Couldn't remove the rule");
    }
  }

  return { apply, enablePerAppRouting, removeRule };
}

/**
 * The Enter action for an app row. Three states means a blind toggle is wrong,
 * so this flips tunnel ↔ direct and leaves `Use targets` to the panel.
 */
export function AppModePrimary({ app, onDone }: { app: AppModeTarget; onDone?: Done }) {
  const { apply, enablePerAppRouting } = useAppActions(app, onDone);

  if (!app.appsEnabled) {
    return <Action title="Turn on App Routing" icon={Icon.Play} onAction={enablePerAppRouting} />;
  }

  const primary = primaryAppMode(app);
  return (
    <Action
      title={primary.title}
      icon={app.mode === "TUNNEL" ? Icon.Circle : Icon.Bolt}
      onAction={() => apply(primary.mode)}
    />
  );
}

/** The explicit three-mode control, minus whichever mode the primary action already offers. */
export function AppModeSection({ app, onDone }: { app: AppModeTarget; onDone?: Done }) {
  const { apply, removeRule } = useAppActions(app, onDone);
  const primary = app.appsEnabled ? primaryAppMode(app).mode : null;

  const modes: { mode: AppRoutingMode; title: string; icon: Icon }[] = [
    { mode: "TUNNEL", title: "Mode: Tunnel All", icon: Icon.Bolt },
    { mode: "TARGETS", title: "Mode: Use Targets", icon: Icon.List },
    { mode: "DIRECT", title: "Mode: Direct", icon: Icon.Circle },
  ];

  return (
    <ActionPanel.Section title="App Mode">
      {modes
        .filter((entry) => entry.mode !== primary)
        .map((entry) => (
          <Action
            key={entry.mode}
            title={entry.title}
            icon={entry.icon}
            onAction={() => apply(entry.mode)}
          />
        ))}
      {app.ruleId ? (
        <Action
          title="Remove App Rule"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={removeRule}
        />
      ) : null}
    </ActionPanel.Section>
  );
}
