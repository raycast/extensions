import { Action, ActionPanel, Color, List, Toast, showToast } from "@raycast/api";
import { App, Shortcut, confirm, deleteApp, hotkeyToString } from "../utils";
import { $_SM_getShortcuts, $_SM_setShortcuts } from "../assets/mixins";
import { EditShortcut } from "../views/edit-shortcut";
import NewShortcut from "../new-shortcut";

interface ShortcutItemProps {
  app: App;
  shortcut: Shortcut;
  setShortcuts: (shortcuts: Shortcut[]) => void;
}

export default function ShortcutItem(props: ShortcutItemProps) {
  const { app, shortcut } = props;

  async function deleteShortcut() {
    if (await confirm("Delete Shortcut")) {
      return;
    }

    const shortcuts = (await $_SM_getShortcuts(app.source)).filter((el) => el.uuid !== shortcut.uuid);
    await $_SM_setShortcuts(app.source, shortcuts);
    props.setShortcuts(shortcuts);
    showToast({
      title: "Shortcut Deleted",
      style: Toast.Style.Success,
    });
  }

  function isDefaultApp(): boolean {
    return app.source === "system" || app.source === "raycast";
  }

  return (
    <List.Item
      title={shortcut.command}
      subtitle={shortcut.when}
      accessories={[{ tag: { color: Color.PrimaryText, value: hotkeyToString(shortcut.hotkey) } }]}
      actions={
        <ActionPanel>
          <Action.Push title="Create New Shortcut" target={<NewShortcut source={app.source} />} />
          <Action.Push
            title="Edit Shortcut"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            target={<EditShortcut app={app} shortcut={shortcut} />}
          />
          <Action
            title="Delete Shortcut"
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={async () => {
              await deleteShortcut();
            }}
          />
          {!isDefaultApp() ? (
            <Action
              title={"Delete " + app.title}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={async () => {
                await deleteApp(app);
              }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
