import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { createInstance, listInstances, NAME_PATTERN, startInstance } from "../lib/lima";
import { ExtensionActions } from "./extension-actions";
import { DEFAULT, SizeFields, sizeOverrides, SizeValues } from "./size-fields";
import { templateChoices, useTemplates } from "./template-choices";

export interface Values extends SizeValues {
  name: string;
  template: string;
  start: boolean;
}

interface Props {
  /** Typed in root search, as the command's argument. */
  name?: string;
  /** Called after Lima created the instance. Without it, the form clears for the next one. */
  onCreated?: (name: string) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A quick instance from one of Lima's templates. Your own lima.yaml files are for Run Manifest. */
export function CreateInstanceForm({ name, onCreated }: Props) {
  const { pop } = useNavigation();
  const { templates, isLoading, lastTemplate, setLastTemplate } = useTemplates();
  const { data: instances } = useCachedPromise(listInstances, [], { onError: () => undefined });

  const { handleSubmit, itemProps, values, reset, focus } = useForm<Values>({
    initialValues: {
      name: name?.trim() ?? "",
      template: lastTemplate,
      cpus: DEFAULT,
      memory: DEFAULT,
      disk: DEFAULT,
      vmType: DEFAULT,
      start: true,
    },
    validation: {
      name(value) {
        const trimmed = value?.trim() ?? "";
        if (!trimmed) return "Give it a name";
        if (!NAME_PATTERN.test(trimmed)) return "Letters and numbers, with . _ or - between them";
        if (instances?.some((instance) => instance.name === trimmed)) return "There's an instance with this name";
      },
    },
    async onSubmit(values) {
      const instanceName = values.name.trim();
      const toast = await showToast({ style: Toast.Style.Animated, title: `Creating ${instanceName}...` });
      try {
        await createInstance({ name: instanceName, source: `template:${values.template}`, ...sizeOverrides(values) });
        setLastTemplate(values.template);
        if (values.start) {
          // The first start downloads the image, so this can take a few minutes.
          toast.title = `Starting ${instanceName}...`;
          toast.message = "The first start downloads the image.";
          await startInstance(instanceName);
        }
        toast.style = Toast.Style.Success;
        toast.title = values.start ? `Created and started ${instanceName}` : `Created ${instanceName}`;
        toast.message = undefined;
        if (onCreated) {
          onCreated(instanceName);
          pop();
        } else {
          reset({ ...values, name: "" });
          focus("name");
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Couldn't create ${instanceName}`;
        toast.message = errorMessage(error);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Instance"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Instance" icon={Icon.Plus} onSubmit={handleSubmit} />
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
      <Form.TextField title="Name" placeholder="dev" autoFocus={!name} {...itemProps.name} />
      <Form.Dropdown
        title="Template"
        info="What the instance runs. Lima downloads its image on the first start."
        {...itemProps.template}
      >
        {templateChoices(templates, lastTemplate)}
      </Form.Dropdown>
      <Form.Separator />
      <SizeFields values={values} itemProps={itemProps} defaultTitle="Template Default" />
      <Form.Separator />
      <Form.Checkbox label="Start after creating" {...itemProps.start} />
    </Form>
  );
}
