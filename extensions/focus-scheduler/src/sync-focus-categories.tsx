import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { useForm } from "@raycast/utils";
import { parseFocusCategoriesExport } from "./lib/categories";
import {
  openSupportFolder,
  supportCategoriesPath,
  syncCategoriesFromConfiguredFiles,
} from "./lib/raycast-categories";
import { rememberCustomCategories } from "./lib/storage";

type SyncFormValues = {
  json: string;
};

export default function SyncFocusCategoriesCommand() {
  const { handleSubmit, itemProps, setValue } = useForm<SyncFormValues>({
    initialValues: { json: "" },
    validation: {
      json: (value) => {
        if (!value?.trim()) return "Paste the Focus Categories JSON export";
        try {
          const parsed = parseFocusCategoriesExport(value);
          if (parsed.length === 0) return "No categories found in JSON";
        } catch {
          return "Invalid JSON";
        }
      },
    },
    async onSubmit(values) {
      const imported = parseFocusCategoriesExport(values.json);
      await rememberCustomCategories(imported);
      await writeFile(
        supportCategoriesPath(),
        JSON.stringify(
          imported.map((c) => ({
            title: c.title,
            categoryId: c.id,
            websiteHosts: c.websiteHosts ?? [],
            applicationIds: c.applicationIds ?? [],
          })),
          null,
          2,
        ),
        "utf8",
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Categories synced",
        message: `${imported.length} categor${imported.length === 1 ? "y" : "ies"} available in Create Focus Schedule`,
      });
      await popToRoot({ clearSearchBar: true });
    },
  });

  async function pasteFromClipboard() {
    const text = await Clipboard.readText();
    if (!text?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard empty",
        message: "Copy a Focus Categories JSON export first",
      });
      return;
    }
    setValue("json", text);
    await showToast({
      style: Toast.Style.Success,
      title: "Pasted from clipboard",
    });
  }

  async function syncFromFilePreference() {
    try {
      const cats = await syncCategoriesFromConfiguredFiles();
      if (cats.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No file found",
          message:
            "Set Categories Export File in preferences, or paste JSON below",
        });
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Synced from file",
        message: `${cats.length} categor${cats.length === 1 ? "y" : "ies"} loaded`,
      });
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync failed",
        message: error instanceof Error ? error.message : "Could not read file",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Categories"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={pasteFromClipboard}
          />
          <Action
            title="Sync from Preferences File"
            icon={Icon.Download}
            onAction={syncFromFilePreference}
          />
          <Action
            title="Open Support Folder"
            icon={Icon.Finder}
            onAction={openSupportFolder}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="How to export"
        text={`1. Open Raycast → Search Focus Categories\n2. Select a category → Export Category (or export several into one JSON array)\n3. Paste the JSON here and submit\n\nYour categories will then appear in the Categories list when creating a schedule.`}
      />
      <Form.TextArea
        title="Focus Categories JSON"
        placeholder='[{ "title": "Work Apps", "apps": [], "websites": [] }]'
        {...itemProps.json}
      />
    </Form>
  );
}
