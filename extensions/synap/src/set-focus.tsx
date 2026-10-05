/**
 * Set Synap Focus — pin an explicit, visible, sticky workspace lens for Raycast.
 *
 * Focus is opt-in and never silent: it is only set here by explicit user
 * action, shown wherever it applies (menu bar, command subtitles, and echoed
 * to the AI via orient), and can be cleared at any time. See ../utils/focus.ts.
 */

import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useConnection, ConnectionErrorEmptyView } from "./components/connection";
import { useWorkspaces } from "./hooks/useWorkspace";
import { getFocus, setFocus, clearFocus } from "./utils/focus";

export default function SetFocus() {
  const { podKey, isLoading: isConnecting } = useConnection();
  const { data: workspaces, isLoading: isLoadingWorkspaces, error } = useWorkspaces(podKey);
  const { data: focus, revalidate: revalidateFocus } = useCachedPromise(getFocus, []);
  const { pop } = useNavigation();

  if (error) {
    return (
      <List isLoading={isConnecting}>
        <ConnectionErrorEmptyView error={error} />
      </List>
    );
  }

  async function focusOn(workspaceId: string, name: string) {
    await setFocus({ workspaceId, name });
    await revalidateFocus();
    await showToast({
      style: Toast.Style.Success,
      title: `Focused on ${name}`,
      message: "New creates and captures default here until cleared.",
    });
    pop();
  }

  async function handleClear() {
    await clearFocus();
    await revalidateFocus();
    await showToast({ style: Toast.Style.Success, title: "Focus cleared", message: "Back to pod-wide." });
    pop();
  }

  return (
    <List isLoading={isConnecting || isLoadingWorkspaces} searchBarPlaceholder="Filter workspaces…">
      <List.Section title={focus ? `Current focus: ${focus.name}` : "No focus set — pod-wide"}>
        {focus && (
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            title="Clear focus (go pod-wide)"
            subtitle="Stop defaulting to a workspace"
            actions={
              <ActionPanel>
                <Action title="Clear Focus" icon={Icon.XMarkCircle} onAction={handleClear} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Workspaces">
        {(workspaces ?? []).map((ws) => {
          const isActive = focus?.workspaceId === ws.id;
          return (
            <List.Item
              key={ws.id}
              icon={
                isActive
                  ? { source: Icon.Checkmark, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={ws.name}
              accessories={isActive ? [{ tag: { value: "Focused", color: Color.Green } }] : []}
              actions={
                <ActionPanel>
                  {!isActive && (
                    <Action
                      title={`Focus on ${ws.name}`}
                      icon={Icon.ArrowRight}
                      onAction={() => focusOn(ws.id, ws.name)}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
