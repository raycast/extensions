import { Form, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMonitors } from "./utils/monitors";
import { execWallpaperEngine } from "./utils/cli";
import { MonitorInfo } from "./utils/types";

export default function ApplyProperties() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const monitors = await getMonitors();
      setMonitors(monitors);
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(values: { json: string; monitor: string }) {
    const jsonText = values.json.trim();
    if (!jsonText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "JSON is required",
      });
      return;
    }

    try {
      JSON.parse(jsonText);
    } catch (parseError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid JSON",
        message: String(parseError),
      });
      return;
    }

    const escapedProperties = `RAW~(${jsonText})~END`;
    const args = ["applyProperties", "-properties", escapedProperties];

    if (values.monitor && values.monitor !== "all") {
      args.push("-monitor", values.monitor);
    }

    try {
      await execWallpaperEngine(args);
      await showToast({
        style: Toast.Style.Success,
        title: "Properties applied",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(err),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Properties" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="Properties JSON"
        placeholder='{"rate": 10, "schemecolor": "1 0 0"}'
      />
      <Form.Dropdown id="monitor" title="Monitor" defaultValue="all">
        <Form.Dropdown.Item value="all" title="All Monitors" />
        {monitors.map((m) => (
          <Form.Dropdown.Item
            key={m.index}
            value={m.index.toString()}
            title={`Monitor ${m.index}: ${m.name}`}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
