import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { openKaiku } from "./lib/kaiku";

type Values = { question: string; tag: string; source: string; days: string };

export default function Command() {
  const [questionError, setQuestionError] = useState<string>();

  async function submit(values: Values) {
    const question = values.question.trim();
    if (!question) {
      setQuestionError("Write a question");
      return;
    }
    const params = new URLSearchParams({ q: question });
    if (values.tag.trim()) params.set("tag", values.tag.trim());
    if (values.source.trim()) params.set("source", values.source.trim());
    if (values.days) params.set("days", values.days);
    if (await openKaiku(`kaiku://chat?${params.toString().replace(/\+/g, "%20")}`)) {
      await showToast({ style: Toast.Style.Success, title: "Question sent to Kaiku" });
      await popToRoot();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask in Kaiku" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What did we decide about the launch date?"
        error={questionError}
        onChange={() => setQuestionError(undefined)}
      />
      <Form.Separator />
      <Form.TextField id="tag" title="Tag" placeholder="Only calls with this tag" />
      <Form.TextField id="source" title="Source" placeholder="Zoom, Google Meet, WhatsApp, Manual" />
      <Form.Dropdown id="days" title="Period" defaultValue="">
        <Form.Dropdown.Item value="" title="Any time" />
        <Form.Dropdown.Item value="7" title="Last 7 days" />
        <Form.Dropdown.Item value="30" title="Last 30 days" />
        <Form.Dropdown.Item value="90" title="Last 90 days" />
        <Form.Dropdown.Item value="365" title="Last year" />
      </Form.Dropdown>
    </Form>
  );
}
