import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { recordHistory, renameTemplate, SavedIcon, saveTemplate, setFavorite } from "../lib/library";
import { IconSettings } from "../lib/settings";

export async function libraryAction(title: string, action: () => void) {
  try {
    action();
    await showToast({ style: Toast.Style.Success, title });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Update Library",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function TemplateForm({ settings, template }: { settings: IconSettings; template?: SavedIcon }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();
  async function submit(values: { name: string }) {
    if (!values.name.trim()) {
      setNameError("Enter a template name");
      return;
    }
    try {
      if (template) renameTemplate(template.id, values.name);
      else saveTemplate(settings, values.name);
      await showToast({ style: Toast.Style.Success, title: template ? "Template Renamed" : "Template Saved" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Template",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return (
    <Form
      navigationTitle={template ? "Rename Template" : "Save Template"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={template ? "Rename Template" : "Save Template"}
            icon={Icon.Document}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={template?.name ?? settings.fileName.replace(/[_-]/g, " ")}
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />
      <Form.Description text="Save this design to reuse its colors, shape, texture, and sizing with any icon." />
    </Form>
  );
}

export function LibraryActions({
  settings,
  isFavorite,
  onChange,
}: {
  settings: IconSettings;
  isFavorite: boolean;
  onChange?: () => void;
}) {
  return (
    <ActionPanel.Section title="Library">
      <Action
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        icon={isFavorite ? Icon.StarDisabled : Icon.Star}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() =>
          libraryAction(isFavorite ? "Removed from Favorites" : "Added to Favorites", () => {
            setFavorite(settings, !isFavorite);
            onChange?.();
          })
        }
      />
      <Action
        title="Save to History"
        icon={Icon.Clock}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        onAction={() =>
          libraryAction("Saved to History", () => {
            recordHistory(settings);
            onChange?.();
          })
        }
      />
      <Action.Push
        title="Save as Template"
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        target={<TemplateForm settings={settings} />}
      />
    </ActionPanel.Section>
  );
}
