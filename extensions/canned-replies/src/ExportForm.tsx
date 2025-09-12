import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { promises as fs } from "fs";
import path from "path";
import type { CannedReply } from "./index";

export default function ExportForm() {
  const { value: replies } = useLocalStorage<CannedReply[]>(
    "canned-replies",
    [],
  );

  async function handleExport(values: { directory: string[] }) {
    if (!replies || replies.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No templates to export",
      });
      return false;
    }
    const dirPath = values.directory?.[0];
    if (!dirPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please choose a destination folder",
      });
      return false;
    }
    const filePath = path.join(dirPath, "canned-replies.json");
    try {
      await fs.writeFile(filePath, JSON.stringify(replies, null, 2), "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: "Export successful",
        message: `Saved to ${filePath}`,
      });
      popToRoot();
    } catch (error) {
      console.error("Export failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Export Templates"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export to JSON" onSubmit={handleExport} />
          <Action.OpenInBrowser
            title="Open Documentation"
            icon={Icon.Globe}
            url="https://github.com/Enragedsaturday/raycast-canned-email-response#readme"
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Save Location"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
