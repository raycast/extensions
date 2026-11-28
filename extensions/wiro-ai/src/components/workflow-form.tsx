import {
  Action,
  ActionPanel,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { credentials } from "../lib/preferences";
import { getWorkflow, runWorkflow, uploadFile } from "../lib/wiro";
import {
  parseWorkflow,
  workflowFieldValue,
  workflowItemError,
  workflowRunInput,
  type WorkflowInput,
  type WorkflowValue,
} from "../lib/workflow";
import { WorkflowRun } from "./workflow-run";

/** The inputs of one workflow, then a run. */
export function WorkflowForm({ fullSlug }: { fullSlug: string }) {
  const { push } = useNavigation();
  // Not cached: a workflow's contents can hold saved secrets, which must not reach the disk.
  const {
    data: workflow,
    isLoading,
    error,
    revalidate,
  } = usePromise(async (slug: string) => parseWorkflow(await getWorkflow(slug, credentials())), [fullSlug], {
    failureToastOptions: { title: "Could not load the workflow" },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // The form holds only what the user entered: an untouched input keeps the workflow's saved
  // value (workflowItemError tells an entered value from the one an untouched input shows).
  const {
    handleSubmit,
    itemProps,
    values: formValues,
  } = useForm<Form.Values>({
    onSubmit: run,
    validation: Object.fromEntries(
      (workflow?.inputs ?? []).map((input) => [
        input.key,
        (value: WorkflowValue | undefined) => workflowItemError(input, values, value),
      ]),
    ),
  });
  const values = formValues as Record<string, WorkflowValue>;

  const valueOf = (input: WorkflowInput) => workflowFieldValue(input, values);

  async function submit() {
    if (submittingRef.current || !workflow) return;
    // The entered values, not the form's: an untouched input must not count as entered.
    await handleSubmit(values);
  }

  async function run() {
    if (submittingRef.current || !workflow) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting the workflow" });
    try {
      const input = workflowRunInput(workflow.inputs, values);
      for (const field of workflow.inputs) {
        if (field.kind !== "file") continue;
        const paths = valueOf(field) as string[];
        if (paths.length === 0) continue;
        toast.message = `Uploading ${paths.length} file${paths.length > 1 ? "s" : ""}`;
        const urls = [];
        for (const path of paths) urls.push(await uploadFile(path, credentials()));
        input[field.key] = urls.length === 1 ? urls[0] : urls;
      }
      const token = await runWorkflow(workflow.fullSlug, input, credentials());
      await toast.hide();
      push(<WorkflowRun workflow={workflow} token={token} />);
    } catch (runError) {
      await toast.hide();
      await showFailureToast(runError, { title: "Could not start the workflow" });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function renderInput(input: WorkflowInput) {
    const common = { ...itemProps[input.key], title: input.label, info: input.description };
    const value = valueOf(input);
    switch (input.kind) {
      case "file":
        return (
          <Form.FilePicker
            key={input.key}
            {...common}
            allowMultipleSelection={false}
            canChooseDirectories={false}
            value={value as string[]}
          />
        );
      case "select":
        return (
          <Form.Dropdown key={input.key} {...common} value={String(value)}>
            {input.options.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
        );
      case "checkbox":
        return (
          <Form.Checkbox
            key={input.key}
            {...itemProps[input.key]}
            label={input.label}
            info={input.description}
            value={value === true}
          />
        );
      case "longtext":
        return <Form.TextArea key={input.key} {...common} placeholder={input.label} value={String(value)} />;
      default:
        return (
          <Form.TextField
            key={input.key}
            {...common}
            placeholder={
              input.kind === "number" && input.initialValue ? `Empty uses ${input.initialValue}` : input.label
            }
            value={String(value)}
          />
        );
    }
  }

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      navigationTitle={workflow?.title ?? "Run Workflow"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Workflow" icon={Icon.Play} onSubmit={submit} />
          {workflow && <Action.OpenInBrowser title="Open Workflow Page" icon={Icon.Globe} url={workflow.url} />}
          {error && !workflow && (
            <>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </>
          )}
        </ActionPanel>
      }
    >
      {error && !workflow && <Form.Description title="Error" text={error.message} />}
      {workflow?.description && <Form.Description text={workflow.description.slice(0, 400)} />}
      {workflow && workflow.inputs.length === 0 && <Form.Description text="This workflow takes no inputs." />}
      {workflow?.inputs.map(renderInput)}
      {workflow && (
        <Form.Description
          title="Price"
          text={`Each of its ${workflow.stepCount} steps is charged at its model's price when it runs.`}
        />
      )}
    </Form>
  );
}
