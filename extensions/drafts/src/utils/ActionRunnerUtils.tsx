import { popToRoot, Form, ActionPanel, Action, open } from "@raycast/api";
import { useState } from "react";
import { AppBaseUrls } from "./Defines";
import { DraftAction } from "./get-all-actions";

export function ActionRunner({ action }: { action: DraftAction }) {
  const [text, setText] = useState("");

  function handleSubmit(values: { additionalText: string }) {
    const runUrl = `${AppBaseUrls.RUN_ACTION}action=${encodeURIComponent(action.name)}&text=${encodeURIComponent(
      values.additionalText
    )}`;
    open(runUrl);
    popToRoot({ clearSearchBar: true });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Action with Text" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="additionalText"
        title="Additional Text"
        placeholder="Enter additional text to pass..."
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
