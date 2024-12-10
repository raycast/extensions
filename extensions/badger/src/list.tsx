import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { BadgerApplication } from "./utils/apps.ts";
import useStorage from "./utils/storage.ts";
import Add from "./add.tsx";

function Command() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<BadgerApplication[]>([]);
  const { getApps, saveApp, removeApp } = useStorage();

  useEffect(() => {
    async function getStorage() {
      setApps(await getApps());
      setLoading(false);
    }
    getStorage();
  }, [loading]);

  async function handleToggle(app: BadgerApplication) {
    await saveApp({ ...app, enabled: !app.enabled });
    setLoading(true);
  }
  async function handleRemove(app?: BadgerApplication) {
    await removeApp(app);
    setLoading(true);
  }

  const CreateNewBadge = () => (
    <Action.Push
      title="Create New Badge"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<Add onPop={() => setLoading(true)} />}
    />
  );

  return (
    <List isLoading={loading}>
      {apps.map((app, index) => (
        <List.Item
          key={index}
          title={app.name}
          icon={{ fileIcon: app.path }}
          accessories={[
            {
              tag: {
                value: app.enabled ? "Enabled" : "",
                color: app.enabled ? Color.Green : Color.SecondaryText,
              },
              icon: app.enabled ? Icon.Checkmark : Icon.CircleDisabled,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={!app.enabled ? "Enable Badge" : "Disable Badge"}
                  icon={!app.enabled ? Icon.CheckCircle : Icon.CircleDisabled}
                  onAction={() => handleToggle(app)}
                />
                <CreateNewBadge />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title={`Remove Badge`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleRemove(app)}
                />
                <Action
                  title="Remove All Badges"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={() => handleRemove()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {!apps.length && (
        <List.EmptyView
          title={"No Badges"}
          icon={Icon.Bell}
          actions={
            <ActionPanel>
              <CreateNewBadge />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default Command;
