import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { fileMatchesKind } from "../lib/params";
import { credentials } from "../lib/preferences";
import { getWorkflow, runWorkflow, uploadFile } from "../lib/wiro";
import {
  parseWorkflow,
  workflowFieldIsEmpty,
  workflowFieldValue,
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
  } = usePromise(async (slug: string) => parseWorkflow(await getWorkflow(slug, credentials())), [fullSlug], {
    failureToastOptions: { title: "Could not load the workflow" },
  });
  const [values, setValues] = useState<Record<string, WorkflowValue>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const valueOf = (input: WorkflowInput) => workflowFieldValue(input, values);

  function setValue(key: string, value: WorkflowValue) {
    setValues((previous) => ({ ...previous, [key]: value }));
    if (errors[key]) setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  async function submit() {
    if (submittingRef.current || !workflow) return;
    const nextErrors: Record<string, string | undefined> = {};
    for (const input of workflow.inputs) {
      const value = valueOf(input);
      if (input.kind === "file") {
        const paths = value as string[];
        if (input.required && workflowFieldIsEmpty(input, values)) nextErrors[input.key] = "Choose a file";
        else if (paths.some((path) => !fileMatchesKind(path, input.fileKind ?? "file"))) {
          nextErrors[input.key] =
            `Choose ${input.fileKind === "audio" ? "an audio" : `a ${input.fileKind ?? "file"}`} file`;
        }
      } else if (input.kind === "number" && String(value).trim() && !Number.isFinite(Number(value))) {
        nextErrors[input.key] = "Enter a number";
      } else if (input.required && workflowFieldIsEmpty(input, values)) {
        nextErrors[input.key] = "Required";
      }
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

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
    const common = { id: input.key, title: input.label, info: input.description, error: errors[input.key] };
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
            onChange={(paths) => setValue(input.key, paths)}
          />
        );
      case "select":
        return (
          <Form.Dropdown
            key={input.key}
            id={input.key}
            title={input.label}
            info={input.description}
            value={String(value)}
            onChange={(next) => setValue(input.key, next)}
          >
            {input.options.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
        );
      case "checkbox":
        return (
          <Form.Checkbox
            key={input.key}
            id={input.key}
            label={input.label}
            info={input.description}
            value={value === true}
            onChange={(next) => setValue(input.key, next)}
          />
        );
      case "longtext":
        return (
          <Form.TextArea
            key={input.key}
            {...common}
            placeholder={input.label}
            value={String(value)}
            onChange={(next) => setValue(input.key, next)}
          />
        );
      default:
        return (
          <Form.TextField
            key={input.key}
            {...common}
            placeholder={
              input.kind === "number" && input.initialValue ? `Empty uses ${input.initialValue}` : input.label
            }
            value={String(value)}
            onChange={(next) => setValue(input.key, next)}
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
