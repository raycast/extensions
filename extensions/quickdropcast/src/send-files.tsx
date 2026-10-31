import { t } from "./lib/i18n/runtime";
import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { filesRequest } from "./lib/payload";
import { reportError, share } from "./lib/quickdrop";
export default function Command() {
  const [busy, setBusy] = useState(false);
  async function submit(values: { files: string[] }) {
    if (busy) return;
    setBusy(true);
    try {
      await share(filesRequest(values.files));
    } catch (error) {
      await reportError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("share")} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title={t("files")}
        allowMultipleSelection
        canChooseDirectories={false}
      />
    </Form>
  );
}
