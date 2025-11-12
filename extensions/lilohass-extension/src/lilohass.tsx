import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getApplications,
} from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [apps, setApps] = useState<{ name: string; path: string }[]>([]);

  useEffect(() => {
    (async () => {
      const result = await getApplications(); // dynamic data
      setApps(result.map((app) => ({ name: app.name, path: app.path })));
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open App"
            onSubmit={async (values) => {
              await showToast(Toast.Style.Success, `Opening ${values.app}`);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="app" title="Select an App" storeValue>
        {apps.map((app) => (
          <Form.Dropdown.Item
            key={app.path}
            title={app.name}
            value={app.path}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
