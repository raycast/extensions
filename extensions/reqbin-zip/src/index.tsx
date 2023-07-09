import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

import { handlePasteSubmit } from "./util/handle-paste-submit";

export default function Command() {
  const [pasteContentsError, setPasteContentsError] = useState<string | undefined>();

  function dropPasteContentsError() {
    if (pasteContentsError && pasteContentsError.length > 0) {
      setPasteContentsError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handlePasteSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create your reqbin" />
      <Form.TextArea
        id="pasteContents"
        title="Reqbin"
        placeholder="Paste your sh*t here..."
        onBlur={(event) => {
          if (event?.target?.value === undefined) {
            return;
          }

          if (event.target.value.length < 1) {
            setPasteContentsError("Paste contents cannot be empty");
          } else {
            dropPasteContentsError();
          }
        }}
        error={pasteContentsError}
        onChange={dropPasteContentsError}
      />
      <Form.Separator />
      <Form.Checkbox
        id="isEditable"
        title="Is Editable?"
        label="Set if the reqbin is editable"
        defaultValue={true}
        storeValue
      />
      <Form.DatePicker id="timeoutDate" title="Timeout Date" min={new Date()} />
    </Form>
  );
}
