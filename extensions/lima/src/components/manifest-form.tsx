import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { tildify } from "../lib/instance";
import { createInstance, listInstances, NAME_PATTERN, startInstance } from "../lib/lima";
import { freeName } from "../lib/manifests";
import { isTemplateFile, readTemplateFile, TemplateFile } from "../lib/template-file";
import { ExtensionActions } from "./extension-actions";
import { DEFAULT, SizeFields, sizeOverrides, SizeValues } from "./size-fields";

interface Values extends SizeValues {
  file: string[];
  name: string;
  start: boolean;
}

interface Props {
  /** The manifest to run. Without it the form asks for a file first: Run File…. */
  path?: string;
  /** Called after the instance was made. The form then closes. */
  onRan?: (name: string) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** "~/lima/pg.yaml · builds on template:debian · 2 provision scripts". */
function describe(path: string, content: TemplateFile): string {
  const base = content.base.length ? `builds on ${content.base.join(", ")}` : "stands on its own";
  const count = content.provisions.length;
  const scripts = count ? `${count} provision ${count === 1 ? "script" : "scripts"}` : "no provision scripts";
  return `${tildify(path)} · ${base} · ${scripts}`;
}

/**
 * Run with Changes: a manifest's values in a form, to run a second copy or a bigger one.
 * Changed fields are passed to limactl and override the file; the file itself stays as it is.
 */
export function ManifestForm({ path, onRan }: Props) {
  const { pop } = useNavigation();
  const { data: instances } = useCachedPromise(listInstances, [], { onError: () => undefined });
  const [content, setContent] = useState<TemplateFile>();
  const [reading, setReading] = useState(false);

  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<Values>({
    initialValues: {
      file: path ? [path] : [],
      name: "",
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
      const source = values.file[0];
      if (!source || !content) {
        setValidationError("file", "Choose a manifest");
        return false;
      }
      const name = values.name.trim();
      const toast = await showToast({ style: Toast.Style.Animated, title: `Creating ${name}...` });
      try {
        await createInstance({ name, source, ...sizeOverrides(values) });
        if (values.start) {
          toast.title = `Starting ${name}...`;
          toast.message = "The first start downloads the image and runs the provision scripts.";
          await startInstance(name);
        }
        toast.style = Toast.Style.Success;
        toast.title = values.start ? `Started ${name}` : `Created ${name}`;
        toast.message = undefined;
        onRan?.(name);
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Couldn't run ${name}`;
        toast.message = errorMessage(error);
      }
    },
  });

  /** Fills the form from the file: its sizes, and its name, or the next free one when that's taken. */
  async function load(file?: string) {
    setContent(undefined);
    if (!file) return;
    if (!isTemplateFile(file)) {
      setValidationError("file", "Pick a .yaml or .yml file");
      return;
    }
    setReading(true);
    try {
      const read = await readTemplateFile(file);
      setContent(read);
      setValue("cpus", read.cpus ? String(read.cpus) : DEFAULT);
      setValue("memory", read.memory ? String(read.memory) : DEFAULT);
      setValue("disk", read.disk ? String(read.disk) : DEFAULT);
      setValue("vmType", read.vmType ?? DEFAULT);
      if (read.name) setValue("name", freeName(read.name, instances ?? []));
    } catch (error) {
      setValidationError("file", errorMessage(error));
    } finally {
      setReading(false);
    }
  }

  // The manifest given, read once the instances are known, so the name skips taken ones.
  useEffect(() => {
    if (path && instances) load(path);
  }, [path, instances]);

  return (
    <Form
      isLoading={reading}
      navigationTitle={path ? "Run with Changes" : "Run File"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" icon={Icon.Play} onSubmit={handleSubmit} />
          <ExtensionActions />
        </ActionPanel>
      }
    >
      {!path && (
        <Form.FilePicker
          title="Manifest"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          {...itemProps.file}
          onChange={(files) => {
            setValue("file", files);
            load(files[0]);
          }}
        />
      )}
      {content && values.file[0] && (
        <Form.Description title={path ? "Manifest" : ""} text={describe(values.file[0], content)} />
      )}
      <Form.Separator />
      <Form.TextField
        title="Name"
        placeholder="dev-2"
        info="The new instance's name. The manifest's own name runs it from Run Manifest; another name makes a separate copy."
        {...itemProps.name}
      />
      <SizeFields values={values} itemProps={itemProps} defaultTitle="As in Manifest" />
      <Form.Separator />
      <Form.Checkbox label="Start after creating" {...itemProps.start} />
      <Form.Description text="The manifest stays as it is. Changes apply to this instance only." />
    </Form>
  );
}
