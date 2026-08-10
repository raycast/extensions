import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import fs from "fs";
import { parseOtpUrl } from "./util/totp";
import { LocalStorage } from "@raycast/api";
import AppsView from "./index";

export default function RestoreData() {
  const { push } = useNavigation();

  const handleRestore = async (values: { files: string[] }) => {
    const filePath = values.files[0];

    if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
      showToast(Toast.Style.Failure, "Invalid backup file");
      return;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const urls = content.split("\n").filter((url) => url.trim() !== "");

      let restoredCount = 0;
      for (const url of urls) {
        const result = parseOtpUrl(url);
        if (result.success) {
          const { name, data } = result.data;
          await LocalStorage.setItem(name, JSON.stringify(data));
          restoredCount++;
        }
      }

      showToast(Toast.Style.Success, `Restored ${restoredCount} app${restoredCount > 1 ? "s" : ""}`);
      push(<AppsView />);
    } catch {
      showToast(Toast.Style.Failure, "Failed to restore backup");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Restore" onSubmit={handleRestore} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Select backup file"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
      />
    </Form>
  );
}
