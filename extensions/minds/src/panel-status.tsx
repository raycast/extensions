import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ResultDetail } from "./components";
import { callMindsTool } from "./mcp";

type Values = { panel: string };

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  async function submit(values: Values) {
    if (!values.panel.trim()) {
      await showToast(Toast.Style.Failure, "Panel is required");
      return;
    }
    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Checking Panel");
    try {
      const panelSelector = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(values.panel.trim())
        ? { panelId: values.panel.trim() }
        : { panelName: values.panel.trim() };
      const result = await callMindsTool("get_panel_status", panelSelector);
      toast.style = Toast.Style.Success;
      toast.title = "Panel status loaded";
      push(<ResultDetail title="Panel Status" result={result} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not load Panel";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Panel" icon={Icon.MagnifyingGlass} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Minds" url="https://getminds.ai/dashboard" />
        </ActionPanel>
      }
    >
      <Form.TextField id="panel" title="Panel" placeholder="Panel name or UUID" />
    </Form>
  );
}
