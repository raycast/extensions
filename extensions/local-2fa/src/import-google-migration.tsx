import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { parseGoogleMigrationUrl } from "./google-migration";
import { upsertAccount } from "./storage";
import { stableAccountId } from "./totp";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { migrationUrl: string }) {
    try {
      setIsLoading(true);
      const parsed = parseGoogleMigrationUrl(values.migrationUrl);

      for (const item of parsed) {
        await upsertAccount({
          id: stableAccountId(item),
          ...item,
          createdAt: new Date().toISOString(),
        });
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Import Complete",
        message: `${parsed.length} account(s) added`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Import Failed" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import Google Authenticator QR"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste an otpauth-migration URL extracted from a Google Authenticator export QR." />
      <Form.TextArea
        id="migrationUrl"
        title="Migration URL"
        placeholder="otpauth-migration://offline?data=..."
      />
    </Form>
  );
}
