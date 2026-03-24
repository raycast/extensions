import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { BuildStatusView } from "./BuildStatusView";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { JenkinsJob, BuildParameter, BuildHistoryEntry } from "../types";
import {
  fetchJobParameters,
  triggerBuild,
  pollQueueItem,
} from "../api/jenkins";
import { pushBuildHistory, pushRecentJob } from "../storage";
import { handleFetchError } from "../utils/errors";

interface BuildParamFormProps {
  job: JenkinsJob;
}

// Named export for direct imports
export function BuildParamForm({ job }: BuildParamFormProps) {
  const { pop, push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: params, isLoading } = useCachedPromise(fetchJobParameters, [
    job.url,
  ]);

  // Auto-trigger immediately when job has no parameters
  useEffect(() => {
    if (!isLoading && params && params.length === 0 && !isSubmitting) {
      setIsSubmitting(true);
      handleSubmit({}).finally(() => setIsSubmitting(false));
    }
  }, [isLoading, params]);

  function validate(values: Record<string, string>): boolean {
    const errors: string[] = [];
    for (const param of params ?? []) {
      const val = values[param.name];
      if (
        param.type !== "BooleanParameterDefinition" &&
        (!val || val.trim() === "")
      ) {
        errors.push(param.name);
      }
    }
    if (errors.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Required fields missing",
        message: errors.join(", "),
      });
      return false;
    }
    return true;
  }

  async function handleSubmit(values: Record<string, string>) {
    if (!validate(values)) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Triggering build...",
      message: job.name,
    });

    try {
      const buildParams: Record<string, string> = {};
      for (const param of params ?? []) {
        const val = values[param.name];
        if (val !== undefined && val !== "") {
          buildParams[param.name] = val;
        }
      }

      const queueUrl = await triggerBuild(job.url, buildParams);

      await pushRecentJob(job.path);

      let buildNumber: number | null = null;
      if (queueUrl) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        buildNumber = await pollQueueItem(queueUrl);
      }

      await pushBuildHistory({
        jobName: job.name,
        jobPath: job.path,
        jobUrl: job.url,
        buildNumber: buildNumber ?? 0,
        triggeredAt: Date.now(),
        status: "running",
      } satisfies BuildHistoryEntry);

      toast.style = Toast.Style.Success;
      toast.title = buildNumber
        ? `Build #${buildNumber} triggered`
        : "Build queued";
      toast.message = job.name;

      pop();
      push(
        <BuildStatusView
          jobName={job.name}
          jobPath={job.path}
          jobUrl={job.url}
          buildNumber={buildNumber ?? 0}
        />,
      );
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Build trigger failed";
      toast.message = handleFetchError(error);
    }
  }

  function renderParamField(param: BuildParameter) {
    switch (param.type) {
      case "BooleanParameterDefinition":
        return (
          <Form.Checkbox
            key={param.name}
            id={param.name}
            label={param.name}
            defaultValue={
              param.defaultValue === true || param.defaultValue === "true"
            }
            storeValue={false}
          />
        );
      case "ChoiceParameterDefinition":
        return (
          <Form.Dropdown
            key={param.name}
            id={param.name}
            title={param.name}
            defaultValue={
              param.defaultValue?.toString() ?? param.choices?.[0] ?? ""
            }
          >
            {(param.choices ?? []).map((choice) => (
              <Form.Dropdown.Item key={choice} value={choice} title={choice} />
            ))}
          </Form.Dropdown>
        );
      case "PasswordParameterDefinition":
        return (
          <Form.PasswordField
            key={param.name}
            id={param.name}
            title={param.name}
            placeholder={param.description ?? ""}
            defaultValue={param.defaultValue?.toString() ?? ""}
          />
        );
      case "StringParameterDefinition":
      default:
        return (
          <Form.TextField
            key={param.name}
            id={param.name}
            title={param.name}
            placeholder={param.description ?? ""}
            defaultValue={param.defaultValue?.toString() ?? ""}
          />
        );
    }
  }

  return (
    <Form
      navigationTitle={job.name}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Trigger Build"
            icon={Icon.Play}
            onSubmit={async (values) => {
              setIsSubmitting(true);
              await handleSubmit(values as Record<string, string>);
              setIsSubmitting(false);
            }}
          />
        </ActionPanel>
      }
    >
      {!isLoading && params && params.length === 0 && (
        <Form.Description title="Info" text="This job has no parameters." />
      )}

      {params && params.length > 0 && (
        <>
          <Form.Description
            title="Parameters"
            text={`Configure build parameters for ${job.name}`}
          />
          <Form.Separator />
          {params.map((param) => renderParamField(param))}
        </>
      )}
    </Form>
  );
}

export default BuildParamForm;
