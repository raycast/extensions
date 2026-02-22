import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import { saveService } from "./utils/storage";
import { GrpcUiItem } from "./types";

const FORMAT_EXAMPLE = `[{ "title": "My Service", "url": "localhost:9000" }, {...}]`;

export default function Command() {
  const [importedItems, setImportedItems] = useState<GrpcUiItem[] | null>(null);

  const formatImportedItems = (items: GrpcUiItem[]) => {
    return items.map((item) => `✓ ${item.title}`).join("\n");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            onSubmit={async (values: { files: string[] }) => {
              const filePath = values.files?.[0];

              if (
                !filePath ||
                !fs.existsSync(filePath) ||
                !fs.lstatSync(filePath).isFile() ||
                !filePath.endsWith(".json")
              ) {
                showToast({ style: Toast.Style.Failure, title: "Please select a valid JSON file" });
                return;
              }

              try {
                const file = fs.readFileSync(filePath, "utf-8");
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
                setImportedItems(validItems);
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
      {importedItems ? (
        <Form.Description title="Imported" text={formatImportedItems(importedItems)} />
      ) : (
        <Form.Description title="Example" text={FORMAT_EXAMPLE} />
      )}
    </Form>
  );
}
