import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { RunningApp, getRunningApps, startCaffeinate } from "./utils";

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<RunningApp[]>([]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const running = await getRunningApps();
        if (!isMounted) return;
        setApps(running);
      } catch (error) {
        if (!isMounted) return;
        await showToast(Toast.Style.Failure, "Failed to list running apps", String(error));
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Caffeinate"
            onSubmit={async (data: { process: string }) => {
              const pid = Number(data.process);
              if (!data.process || !Number.isInteger(pid) || pid <= 0) {
                await showToast(Toast.Style.Failure, "Please select an application");
                return;
              }

              try {
                await startCaffeinate({ status: true }, "Caffeinate process started", { watchPid: pid });
                popToRoot();
              } catch (error) {
                await showToast(Toast.Style.Failure, "Failed to caffeinate", String(error));
              }
            }}
          />
        </ActionPanel>
      }
    >
      {apps.length === 0 && !loading ? (
        <Form.Description title="No running apps found" text="No windowed applications were detected to watch." />
      ) : (
        <Form.Dropdown id="process" title="Application">
          {apps.map((app) => (
            <Form.Dropdown.Item key={`${app.pid}`} value={`${app.pid}`} title={app.name} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
