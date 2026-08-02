import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { EXAMPLE_EXPORT, EXPORT_VERSION, importShortcuts } from "./lib/import-export";

const exampleJson = JSON.stringify(EXAMPLE_EXPORT, null, 2);

const schemaJson = JSON.stringify(
  {
    type: "object",
    required: ["format", "version", "exportedAt", "shortcuts"],
    properties: {
      format: { const: "shortcut-vault" },
      version: { const: EXPORT_VERSION },
      exportedAt: { type: "string", format: "date-time" },
      shortcuts: {
        type: "array",
        items: {
          type: "object",
          required: [
            "id",
            "commandName",
            "modifiers",
            "key",
            "shortcutDisplay",
            "ownerName",
            "ownerType",
            "scope",
            "sourceType",
            "createdAt",
            "updatedAt",
          ],
          properties: {
            id: { type: "string" },
            commandName: { type: "string" },
            modifiers: {
              type: "array",
              items: { enum: ["command", "option", "control", "shift", "fn"] },
            },
            key: { type: "string" },
            shortcutDisplay: { type: "string" },
            ownerName: { type: "string" },
            ownerType: { enum: ["mac-app", "webapp", "system", "other"] },
            scope: { enum: ["global", "app", "webapp"] },
            notes: { type: "string" },
            sourceType: { const: "custom" },
            sourceUrl: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  null,
  2,
);

export default function Command() {
  return (
    <Detail
      markdown={[
        "# Import Shortcuts",
        "",
        "Shortcut Vault imports local JSON files that use the official Shortcut Vault export format.",
        "",
        "## Supported Format",
        "",
        `- Format: \`shortcut-vault\``,
        `- Version: \`${EXPORT_VERSION}\``,
        "- File type: JSON",
        "- Imported shortcuts must have `sourceType: custom`.",
        "- Duplicate IDs are handled safely by generating new IDs.",
        "",
        "## Validation Rules",
        "",
        "- The top-level JSON value must be an object.",
        "- `format`, `version`, `exportedAt`, and `shortcuts` are required.",
        "- Every shortcut must include command name, modifiers, key, owner, scope, source type, and timestamps.",
        "- Unsupported versions are rejected instead of guessed.",
        "",
        "## Example JSON",
        "",
        "```json",
        exampleJson,
        "```",
      ].join("\n")}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Import">
            <Action.Push title="Import JSON" icon={Icon.Upload} target={<ImportForm />} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Reference">
            <Action.Push title="View JSON Schema" icon={Icon.Code} target={<SchemaDetail />} />
            <Action
              title="Copy Example JSON"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(exampleJson);
                await showToast({ style: Toast.Style.Success, title: "Example JSON copied" });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ImportForm() {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { file: string[] }) {
    if (isSubmitting) {
      return;
    }

    const filePath = values.file[0];

    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a JSON file",
        message: "Select a Shortcut Vault export file to import.",
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing shortcuts" });

    try {
      const result = await importShortcuts(filePath);
      toast.style = Toast.Style.Success;
      toast.title = `Imported ${result.importedCount} shortcuts`;
      toast.message = result.regeneratedIds
        ? `${result.regeneratedIds} duplicate ID${result.regeneratedIds === 1 ? "" : "s"} regenerated`
        : "Ready to search";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Import failed";
      toast.message = error instanceof Error ? error.message : "Check the file and try again.";
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Import JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Shortcuts" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="JSON File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
      <Form.Description
        title="Validation"
        text="Shortcut Vault will validate the file before saving anything. Duplicate IDs are imported with new IDs."
      />
    </Form>
  );
}

function SchemaDetail() {
  return (
    <Detail
      markdown={["# Shortcut Vault JSON Schema", "", "```json", schemaJson, "```"].join("\n")}
      actions={
        <ActionPanel>
          <Action
            title="Copy JSON Schema"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(schemaJson);
              await showToast({ style: Toast.Style.Success, title: "JSON schema copied" });
            }}
          />
          <Action
            title="Copy Example JSON"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(exampleJson);
              await showToast({ style: Toast.Style.Success, title: "Example JSON copied" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
