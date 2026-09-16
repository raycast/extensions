import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ResultDetail } from "./components";
import { callMindsTool } from "./mcp";

type Values = { panel: string; request: string; locale: string; stimulus: string; stimulusLabel: string };

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  async function submit(values: Values) {
    if (!values.panel.trim() || !values.request.trim()) {
      await showToast(Toast.Style.Failure, "Panel and research request are required");
      return;
    }
    if (values.stimulus.length > 20_000) {
      await showToast(Toast.Style.Failure, "Stimulus is too long", "Use 20,000 characters or fewer.");
      return;
    }
    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Planning study", "This creates a draft only.");
    try {
      const panelSelector = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(values.panel.trim())
        ? { panelId: values.panel.trim() }
        : { panelName: values.panel.trim() };
      const result = await callMindsTool("plan_panel_study", {
        ...panelSelector,
        request: values.request.trim(),
        studyLocale: values.locale,
        ...(values.stimulus.trim()
          ? {
              source: {
                kind: "prompt",
                label: values.stimulusLabel.trim() || "Raycast stimulus",
                content: values.stimulus.trim(),
              },
            }
          : {}),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Study plan ready";
      toast.message = "Review the draft before running research.";
      push(<ResultDetail title="Panel Study Draft" result={result} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not plan study";
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
          <Action.SubmitForm title="Create Draft Plan" icon={Icon.Document} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Minds" url="https://getminds.ai/dashboard" />
        </ActionPanel>
      }
    >
      <Form.TextField id="panel" title="Panel" placeholder="Panel name or UUID" />
      <Form.TextArea
        id="request"
        title="Research Request"
        placeholder="Describe the objective and questions to plan."
      />
      <Form.Dropdown id="locale" title="Study Language" defaultValue="en">
        <Form.Dropdown.Item value="en" title="English" />
        <Form.Dropdown.Item value="de" title="German" />
        <Form.Dropdown.Item value="es" title="Spanish" />
        <Form.Dropdown.Item value="fr" title="French" />
        <Form.Dropdown.Item value="zh" title="Chinese" />
        <Form.Dropdown.Item value="tr" title="Turkish" />
        <Form.Dropdown.Item value="ar" title="Arabic" />
        <Form.Dropdown.Item value="ja" title="Japanese" />
        <Form.Dropdown.Item value="ko" title="Korean" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="stimulusLabel" title="Stimulus Label" placeholder="Optional concept or asset name" />
      <Form.TextArea
        id="stimulus"
        title="Stimulus Text"
        placeholder="Optional respondent-visible copy, concept, or description to evaluate"
      />
      <Form.Description text="This command creates a non-executing draft. Review and run it in Minds." />
    </Form>
  );
}
