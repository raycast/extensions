import { Action, ActionPanel, Icon, List, closeMainWindow, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useMemo, useState } from "react";
import { isIt2apiAvailable } from "./core/it2api";
import { Session, listSessions } from "./core/it2api-runner";
import { PermissionErrorScreen, isPermissionError } from "./core/permission-error-screen";

const IT2API_HINT = "Enable Python API in iTerm2 → Preferences → General → Magic";

const groupByWindow = (
  sessions: Session[],
): { windowId: string; label: string; sessions: Session[]; windowIndex: number }[] => {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const existing = map.get(s.windowId) ?? [];
    map.set(s.windowId, [...existing, s]);
  }
  return Array.from(map.entries()).map(([windowId, ss], index) => ({
    windowId,
    label: `Window ${index + 1}`,
    sessions: ss,
    windowIndex: index + 1,
  }));
};

const moveToNewWindowScript = `
  tell application "iTerm" to activate
  tell application "System Events"
    tell process "iTerm2"
      click menu item "New Window" of menu "Move Session to Window" of menu item "Move Session to Window" of menu "Session" of menu bar item "Session" of menu bar 1
    end tell
  end tell
`;

const makeActivateWindowScript = (windowIndex: number) => {
  return `
    tell application "iTerm" to activate
    tell application "System Events"
      tell process "iTerm2"
        click menu item ${windowIndex} of menu "Move Session to Window" of menu item "Move Session to Window" of menu "Session" of menu bar item "Session" of menu bar 1
      end tell
    end tell
  `;
};

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const it2apiAvailable = isIt2apiAvailable();

  const { windows, it2apiError } = useMemo(() => {
    if (!it2apiAvailable) return { windows: [] as ReturnType<typeof groupByWindow>, it2apiError: "it2api not found" };
    try {
      return { windows: groupByWindow(listSessions()), it2apiError: undefined };
    } catch (e) {
      return { windows: [] as ReturnType<typeof groupByWindow>, it2apiError: (e as Error).message };
    }
  }, [it2apiAvailable]);

  const run = async (script: string) => {
    try {
      const result = await runAppleScript(script);
      if (result && result !== "true") await showHUD(result);
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      const error = e as Error;
      if (isPermissionError(error.message)) {
        setHasPermissionError(true);
        return;
      }
      await showToast({ style: Toast.Style.Failure, title: "Cannot move session", message: error.message });
    }
  };

  if (hasPermissionError) return <PermissionErrorScreen />;

  return (
    <List searchBarPlaceholder="Choose destination..." navigationTitle="Move Current Session To">
      {it2apiError && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot connect to iTerm2"
          description={`${it2apiError}\n\n${IT2API_HINT}`}
        />
      )}
      {!it2apiError && (
        <>
          <List.Item
            icon={Icon.Window}
            title="New Window"
            subtitle="Detach current pane into its own window"
            actions={
              <ActionPanel>
                <Action title="Move to New Window" icon={Icon.Window} onAction={() => run(moveToNewWindowScript)} />
              </ActionPanel>
            }
          />
          {windows.length > 1 && (
            <List.Section title="Existing Windows">
              {windows.map((w) => (
                <List.Item
                  key={w.windowId}
                  icon={Icon.AppWindowGrid2x2}
                  title={w.label}
                  subtitle={`${w.sessions.length} session${w.sessions.length > 1 ? "s" : ""}`}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Move Current Session Here"
                        icon={Icon.AppWindowGrid2x2}
                        onAction={() => run(makeActivateWindowScript(w.windowIndex))}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
