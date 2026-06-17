import { ActionPanel, Form, Action, showToast, Toast, popToRoot } from "@raycast/api";
import fs from "fs/promises";
import { saveService } from "./utils/storage";
import { GrpcUiItem } from "./types";

const FORMAT_EXAMPLE = `[{ "title": "My Service", "url": "localhost:9000" }, {...}]`;

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            onSubmit={async (values: { files: string[] }) => {
              const filePath = values.files?.[0];

              if (!filePath || !filePath.endsWith(".json")) {
                showToast({ style: Toast.Style.Failure, title: "Please select a valid JSON file" });
                return;
              }

              try {
                const stat = await fs.lstat(filePath);
                if (!stat.isFile()) {
                  showToast({ style: Toast.Style.Failure, title: "Please select a valid JSON file" });
                  return;
                }

                const file = await fs.readFile(filePath, "utf-8");
                const parsedItemList: GrpcUiItem[] = JSON.parse(file);
                const validItems: GrpcUiItem[] = [];

                for (const item of parsedItemList) {
                  if (!item.title || !item.url) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Invalid item",
                      message: "Each item must have title and url",
                    });
                    return;
                  }
                  await saveService(item.title, item.url);
                  validItems.push(item);
                }

                showToast({
                  style: Toast.Style.Success,
                  title: `Imported ${validItems.length} service${validItems.length === 1 ? "" : "s"}`,
                });
                popToRoot();
              } catch {
                showToast({ style: Toast.Style.Failure, title: "Error parsing JSON" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        allowMultipleSelection={false}
        title="JSON File"
        info="Array of { title, url } objects"
      />
      <Form.Description title="Example" text={FORMAT_EXAMPLE} />
    </Form>
  );
}
