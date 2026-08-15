import { Action, ActionPanel, Alert, confirmAlert, Form, showToast, Toast } from "@raycast/api";
import { generateOtpUrl } from "./util/totp";
import fs from "fs";
import path from "path";
import { useApps } from "./util/hooks";

export default function BackupData() {
  const { apps } = useApps({ doUpdates: false });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async (values: { folders: string[] }) => {
              const target = values.folders?.[0];

              if (!target || !fs.existsSync(target) || !fs.lstatSync(target).isDirectory()) {
                await showToast(Toast.Style.Failure, "Invalid destination");
                return;
              }

              if (apps.length === 0) {
                await showToast(Toast.Style.Failure, "No 2FA codes to backup");
                return;
              }

              if (
                !(await confirmAlert({
                  title: "Backup Apps?",
                  message: "Your keys will be stored in plain text, treat the file as sensitive data.",
                  primaryAction: { title: "Backup", style: Alert.ActionStyle.Destructive },
                }))
              ) {
                return;
              }

              let content = "";
              let count = 0;
              for (const app of apps) {
                content += generateOtpUrl(app.name, app.secret, app.options) + "\n";
                count++;
              }

              const filename = `raycast-two-factor-authentication-codes-${new Date().toISOString()}.txt`;

              try {
                fs.writeFileSync(path.join(target, filename), content);
                await showToast(Toast.Style.Success, `Backed up ${count} app${count > 1 ? "s" : ""}`);
              } catch {
                await showToast(Toast.Style.Failure, "Unable to create backup");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folders"
        title="Pick destination"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
