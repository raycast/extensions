import { Action, ActionPanel, Alert, confirmAlert, Form, showToast, Toast } from "@raycast/api";
import { generateOtpUrl } from "./util/totp";
import fs from "fs";
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
              if (
                await confirmAlert({
                  title: "Backup Apps?",
                  message: "Your keys will be stored in plain text, treat the file as sensitive data.",
                  primaryAction: { title: "Backup", style: Alert.ActionStyle.Destructive },
                })
              ) {
                const target = values.folders[0];

                if (apps.length == 0) {
                  showToast(Toast.Style.Failure, "No 2FA codes to backup");
                }
                if (!fs.existsSync(target) || fs.lstatSync(target).isDirectory()) {
                  showToast(Toast.Style.Failure, "Invalid destination");
                }

                let content = "";
                let count = 0;
                for (const app of apps) {
                  const url = generateOtpUrl(app.name, app.secret, app.options) + "\n";
                  content += url;
                  count++;
                }

                const filename = `raycast-two-factor-authentication-codes-${new Date().toISOString()}.txt`;

                try {
                  fs.writeFileSync(target + "/" + filename, content);
                  showToast(Toast.Style.Success, `Backed up ${count} app${count > 1 ? "s" : ""}`);
                } catch {
                  showToast(Toast.Style.Failure, "Unable to create backup");
                }
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
