import { Action, ActionPanel, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { useEffect, useReducer } from "react";
import { getErrorMessage } from "../feedback/error-actions";
import { detectCliSetup } from "./detection";
import { runCliInstallation, type CliOperation } from "./installation";
import { cliSetupLifecycleReducer, INITIAL_LIFECYCLE } from "./lifecycle";
import { lifecycleScreen, screenMarkdown, type SetupAction } from "./screens";

interface SetupActionItemProps {
  action: SetupAction;
  onRun: (operation: CliOperation) => void;
  onRefresh: () => void;
}

function SetupActionItem({ action, onRun, onRefresh }: SetupActionItemProps) {
  switch (action.type) {
    case "run":
      return <Action title={action.title} icon={Icon.Download} onAction={() => onRun(action.operation)} />;
    case "copy":
      return <Action.CopyToClipboard title={action.title} content={action.content} />;
    case "open":
      return <Action.OpenInBrowser title={action.title} url={action.url} shortcut={action.shortcut} />;
    case "preferences":
      return <Action title={action.title} icon={Icon.Gear} onAction={openExtensionPreferences} />;
    case "refresh":
      return (
        <Action
          title={action.title}
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      );
  }
}

export default function Command() {
  const [lifecycle, dispatch] = useReducer(cliSetupLifecycleReducer, INITIAL_LIFECYCLE);

  useEffect(() => {
    if (lifecycle.status !== "checking") return;
    let active = true;
    void detectCliSetup()
      .then((setup) => {
        if (active) dispatch({ type: "ready", setup });
      })
      .catch((error: unknown) => {
        if (active) dispatch({ type: "failed", error: getErrorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [lifecycle]);

  useEffect(() => {
    if (lifecycle.status !== "running") return;
    const { operation } = lifecycle;
    let active = true;
    void runCliInstallation(operation)
      .then((setup) => {
        if (active) dispatch({ type: "ready", setup });
      })
      .catch((error: unknown) => {
        if (active) dispatch({ type: "failed", error: getErrorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [lifecycle]);

  const brewInProgress = lifecycle.status === "ready" && lifecycle.setup.state === "installing";

  useEffect(() => {
    if (!brewInProgress) return;
    let active = true;
    const timer = setInterval(() => {
      void detectCliSetup()
        .then((next) => {
          if (active) dispatch({ type: "ready", setup: next });
        })
        .catch(() => {
          // Keep the in-progress view; the next poll rechecks.
        });
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [brewInProgress]);

  function check() {
    dispatch({ type: "check" });
  }

  function run(operation: CliOperation) {
    dispatch({ type: "run", operation });
  }

  const screen = lifecycleScreen(lifecycle);

  return (
    <Detail
      markdown={screenMarkdown(screen)}
      isLoading={screen.isLoading}
      actions={
        <ActionPanel>
          {screen.actions.map((group) => (
            <ActionPanel.Section key={group[0]?.title}>
              {group.map((action) => (
                <SetupActionItem key={action.title} action={action} onRun={run} onRefresh={check} />
              ))}
            </ActionPanel.Section>
          ))}
        </ActionPanel>
      }
    />
  );
}
