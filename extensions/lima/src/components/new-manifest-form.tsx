import { Action, ActionPanel, Form, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { tildify } from "../lib/instance";
import { NAME_PATTERN } from "../lib/lima";
import { createManifest, manifestsFolder } from "../lib/manifests";
import { ExtensionActions } from "./extension-actions";
import { templateChoices, useTemplates } from "./template-choices";

interface Values {
  name: string;
  template: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Writes a manifest that builds on a template, then opens it in the editor for the rest. */
export function NewManifestForm({ onCreated }: { onCreated?: (name: string) => void }) {
  const { pop } = useNavigation();
  const { templates, isLoading, lastTemplate } = useTemplates();
  const folder = tildify(manifestsFolder());

  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: { name: "", template: lastTemplate },
    validation: {
      name(value) {
        const trimmed = value?.trim() ?? "";
        if (!trimmed) return "Give it a name";
        if (!NAME_PATTERN.test(trimmed)) return "Letters and numbers, with . _ or - between them";
      },
    },
    async onSubmit(values) {
      const name = values.name.trim();
      try {
        const path = await createManifest(name, values.template);
        await open(path);
        await showToast({ style: Toast.Style.Success, title: `Created ${name}.yaml`, message: "Fill in the rest" });
        onCreated?.(name);
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't create the manifest",
          message: errorMessage(error),
        });
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="New Manifest"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create and Edit" icon={Icon.Document} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Browse Templates"
            icon={Icon.Book}
            url="https://lima-vm.io/docs/templates/"
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          <ExtensionActions />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="dev"
        info="The file's name, and the name of the instance it makes."
        {...itemProps.name}
      />
      <Form.Dropdown title="Start From" info="The template the manifest builds on." {...itemProps.template}>
        {templateChoices(templates, lastTemplate)}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description
        title="Writes"
        text={`${folder}/${values.name.trim() || "name"}.yaml, then opens it in your editor. Sizes, mounts and scripts are written out, commented, to fill in.`}
      />
    </Form>
  );
}
