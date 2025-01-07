import { Action, ActionPanel, Form, Icon, launchCommand, LaunchType, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import getBadgerApps, { BadgerApplication } from "./utils/apps.ts";
import useStorage from "./utils/storage.ts";

function Command(props: { onPop: () => void }) {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<BadgerApplication[]>([]);
  const [allApps, setAllApps] = useState<BadgerApplication[]>([]);
  const { getApps, saveApp } = useStorage();
  const { pop } = useNavigation();
  const { onPop } = props;

  useEffect(() => {
    async function getStorage() {
      setApps(await getApps());
      setAllApps(await getBadgerApps());
      setLoading(false);
    }
    getStorage();
  }, []);

  async function handleSubmit(values: { app: string }) {
    const app = allApps.filter((appItem) => appItem.bundleId === values.app).pop();
    app!.enabled = true;
    saveApp(app!).then(() => {
      showToast({ title: `Added ${app!.name}` });
      if (onPop) {
        pop();
        onPop();
      } else {
        launchCommand({ name: "list", type: LaunchType.UserInitiated });
      }
    });
  }

  return (
    <Form
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel>
            <Action.SubmitForm title="Create Badge" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
          </ActionPanel>
        )
      }
    >
      <Form.Description text="Applications must be running or pinned to the Dock for badge counts to appear in the menu bar." />
      <Form.Dropdown id="app" title="Application">
        {allApps.map((app, index) => {
          if (apps.filter((appItem) => appItem.bundleId === app.bundleId).length !== 0) return;
          return <Form.Dropdown.Item key={index} value={app.bundleId} title={app.name} icon={{ fileIcon: app.path }} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}

export default Command;
