import { Action, ActionPanel, Icon, List, closeMainWindow, PopToRootType } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { readSession, switchTo, moveWindow, Workspace, ROTARA_SITE } from "./rotara";

/** Hands the request to Rotara, then closes Raycast; a failure stays on screen as a toast. */
async function run(fn: () => Promise<void>, failure: string) {
  try {
    await fn();
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showFailureToast(error, { title: failure });
  }
}

export default function WorkspaceList({ mode }: { mode: "switch" | "move" }) {
  const { data: session, isLoading, error, revalidate } = usePromise(readSession);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't read Rotara's workspaces"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isLoading || session === undefined) return <List isLoading searchBarPlaceholder="Search workspaces" />;

  if (session === null) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.AppWindowGrid3x3}
          title="No Rotara workspaces found"
          description="This extension needs the Rotara app. Open it once, or download it free for 14 days."
          actions={
            <ActionPanel>
              <Action.Open title="Open Rotara" icon={Icon.AppWindow} target="rotara://settings?tab=workspaces" />
              <Action.OpenInBrowser title="Get Rotara" url={ROTARA_SITE} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const workspaces = mode === "move" ? session.workspaces.filter((w) => w.id !== session.activeID) : session.workspaces;

  if (workspaces.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.AppWindowGrid3x3}
          title="No other workspaces"
          description="Create one with the New Workspace command."
        />
      </List>
    );
  }

  const actions = (w: Workspace) => {
    const current = w.id === session.activeID;
    const moveHere = (
      <Action
        title="Move Window Here"
        icon={Icon.ArrowRight}
        onAction={() => run(() => moveWindow(w.name, true), "Couldn't move the window")}
      />
    );
    const sendHere = (
      <Action
        title="Send Window Here"
        icon={Icon.Upload}
        onAction={() => run(() => moveWindow(w.name, false), "Couldn't send the window")}
      />
    );
    if (mode === "move") {
      return (
        <ActionPanel>
          {moveHere}
          {sendHere}
        </ActionPanel>
      );
    }
    return (
      <ActionPanel>
        <Action
          title="Switch"
          icon={Icon.ArrowRight}
          onAction={() => run(() => switchTo(w.name), "Couldn't switch workspace")}
        />
        {!current && moveHere}
        {!current && sendHere}
      </ActionPanel>
    );
  };

  return (
    <List searchBarPlaceholder="Search workspaces">
      {workspaces.map((w) => {
        const accessories: List.Item.Accessory[] = [];
        if (w.id === session.activeID) accessories.push({ tag: "Current" });
        if (w.number <= 9) accessories.push({ text: `⌃${w.number}` });
        return (
          <List.Item
            key={w.id}
            title={w.name}
            icon={{ source: Icon.CircleFilled, tintColor: w.color }}
            accessories={accessories}
            actions={actions(w)}
          />
        );
      })}
    </List>
  );
}
