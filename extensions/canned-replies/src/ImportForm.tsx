import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { promises as fs } from "fs";
import type { CannedReply } from "./index";

export default function ImportForm() {
  const { value: replies, setValue: setReplies } = useLocalStorage<
    CannedReply[]
  >("canned-replies", []);

  async function handleImport(values: { file: string[] }) {
    const filePath = values.file?.[0];
    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a JSON file",
      });
      return false;
    }
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      if (!Array.isArray(data)) {
        throw new Error("JSON must be an array of templates");
      }
      if (replies && replies.length > 0) {
        const ok = await confirmAlert({
          title: "Import Templates",
          message: "Importing will replace all existing templates. Continue?",
          primaryAction: {
            title: "Import",
            style: Alert.ActionStyle.Destructive,
          },
          dismissAction: { title: "Cancel" },
        });
        if (!ok) {
          popToRoot();
          return;
        }
      }
      const importedList: CannedReply[] = data.map((item) => {
        const title =
          typeof item.title === "string" && item.title.trim().length > 0
            ? item.title
            : "Untitled";
        const body = typeof item.body === "string" ? item.body : "";
        return {
          id:
            typeof item.id === "string" && item.id
              ? item.id
              : Math.random().toString(36).slice(2),
          title,
          body,
          createdAt: item.createdAt
            ? String(item.createdAt)
            : new Date().toISOString(),
          updatedAt: item.updatedAt
            ? String(item.updatedAt)
            : new Date().toISOString(),
        } as CannedReply;
      });
      await setReplies(importedList);
      await showToast({
        style: Toast.Style.Success,
        title: "Import successful",
        message: `${importedList.length} templates imported`,
      });
      popToRoot();
    } catch (error) {
      console.error("Import failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Import Templates"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import from JSON" onSubmit={handleImport} />
          <Action.OpenInBrowser
            title="Open Documentation"
            icon={Icon.Globe}
            url="https://github.com/Enragedsaturday/raycast-canned-email-response#readme"
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="JSON File"
        allowMultipleSelection={false}
        canChooseFiles
        canChooseDirectories={false}
      />
    </Form>
  );
}
