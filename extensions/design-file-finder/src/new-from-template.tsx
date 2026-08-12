import { useMemo } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { createFromTemplate, listTemplates, sanitizeName, targetPathFor, TemplateRecord } from "./lib/templates";
import { defForPath } from "./lib/extensions";
import { AppKind } from "./lib/types";

interface FormValues {
  template: string;
  name: string;
  destination: string[];
  wrapInFolder: boolean;
  openAfter: boolean;
}

const APP_ICON: Record<AppKind, { icon: Icon; color: Color }> = {
  premiere: { icon: Icon.Video, color: Color.Purple },
  aftereffects: { icon: Icon.Stars, color: Color.Magenta },
  photoshop: { icon: Icon.Image, color: Color.Blue },
  illustrator: { icon: Icon.Brush, color: Color.Orange },
};

const APP_ORDER: AppKind[] = ["premiere", "aftereffects", "photoshop", "illustrator"];

function Guidance(props: { markdown: string }) {
  return (
    <Detail
      markdown={props.markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

export default function NewFromTemplate() {
  const { templatesFolder, defaultDestination } = getPreferenceValues<Preferences.NewFromTemplate>();

  const { data: templates = [], isLoading } = useCachedPromise(listTemplates, [templatesFolder ?? ""], {
    execute: Boolean(templatesFolder),
    keepPreviousData: true,
    initialData: [] as TemplateRecord[],
  });

  const grouped = useMemo(
    () =>
      APP_ORDER.map((app) => [app, templates.filter((t) => t.app === app)] as const).filter(
        ([, items]) => items.length > 0,
      ),
    [templates],
  );

  async function handleSubmit(values: FormValues) {
    const template = values.template;
    const name = values.name?.trim();
    const dest = values.destination?.[0];
    if (!template) {
      await showFailureToast(new Error("Select a template"), { title: "No template" });
      return;
    }
    const base = sanitizeName(name);
    if (!name || !base || base.startsWith(".")) {
      await showFailureToast(new Error("Use letters or numbers in the name"), {
        title: "Invalid name",
      });
      return;
    }
    if (!dest) {
      await showFailureToast(new Error("Choose a destination folder"), { title: "No destination" });
      return;
    }

    const def = defForPath(template);
    if (!def) {
      await showFailureToast(new Error("Unknown template type"), { title: "Bad template" });
      return;
    }

    try {
      const plan = targetPathFor({
        destination: dest,
        name,
        ext: def.ext,
        wrapInFolder: values.wrapInFolder,
      });
      await createFromTemplate(template, plan);
      await showToast({ style: Toast.Style.Success, title: "Created", message: plan.file });
      if (values.openAfter) await open(plan.file);
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Could not create file" });
    }
  }

  if (!templatesFolder) {
    return (
      <Guidance
        markdown={`# New From Template\n\nSet a **Templates Folder** in this command's preferences first.\n\nPoint it at a folder of starter files (\`.psd\`, \`.ai\`, \`.aep\`, \`.prproj\`). They'll show up here to create new projects from.`}
      />
    );
  }

  if (!isLoading && templates.length === 0) {
    return (
      <Guidance
        markdown={`# No templates found\n\nNo \`.psd\` / \`.ai\` / \`.aep\` / \`.prproj\` files under:\n\n\`${templatesFolder}\`\n\nAdd starter files there, or change the **Templates Folder** in preferences.`}
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create File" icon={Icon.NewDocument} onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="template" title="Template" storeValue>
        {grouped.map(([app, items]) => (
          <Form.Dropdown.Section key={app} title={items[0].label}>
            {items.map((t) => (
              <Form.Dropdown.Item
                key={t.path}
                value={t.path}
                title={t.name}
                icon={{ source: APP_ICON[app].icon, tintColor: APP_ICON[app].color }}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.TextField id="name" title="Project Name" placeholder="My Project" />
      <Form.FilePicker
        id="destination"
        title="Destination"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={defaultDestination ? [defaultDestination] : undefined}
      />
      <Form.Checkbox
        id="wrapInFolder"
        title="Project Folder"
        label="Create inside a new folder named after the project"
      />
      <Form.Checkbox
        id="openAfter"
        title="Open After Creating"
        label="Open the new file after creating"
        defaultValue={true}
      />
    </Form>
  );
}
