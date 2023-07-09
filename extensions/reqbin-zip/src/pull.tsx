import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { handlePullSubmit } from "./util/handle-pull-submit";

export default function Command() {
  const [reqbinUrlContentsError, setReqbinUrlContentsError] = useState<string | undefined>();

  function dropPasteContentsError() {
    if (reqbinUrlContentsError && reqbinUrlContentsError.length > 0) {
      setReqbinUrlContentsError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handlePullSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Copy a ReqBin to your clipboard" />
      <Form.TextField
        id="pullUrl"
        title="ReqBin URL"
        placeholder=""
        onBlur={(event) => {
          if (event?.target?.value === undefined) {
            return;
          }

          if (event.target.value.length < 1) {
            setReqbinUrlContentsError("Paste contents cannot be empty");
          } else {
            dropPasteContentsError();
          }
        }}
        error={reqbinUrlContentsError}
        onChange={dropPasteContentsError}
      />
    </Form>
  );
}
