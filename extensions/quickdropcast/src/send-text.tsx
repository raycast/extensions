import { t } from "./lib/i18n/runtime";
import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { textRequest } from "./lib/payload";
import { reportError, share } from "./lib/quickdrop";
export default function Command() {
  const [busy, setBusy] = useState(false);
  async function submit(values: { text: string }) {
    if (busy) return;
    setBusy(true);
    try {
      await share(textRequest(values.text));
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
      <Form.TextArea
        id="text"
        title={t("text")}
        placeholder={t("placeholder")}
      />
    </Form>
  );
}
