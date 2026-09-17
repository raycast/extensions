import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { gitlab } from "../common";
import { getErrorMessage } from "../utils";

const VARIABLE_SLOTS = 3;

interface PipelineTriggerRefs {
  branches: { name: string; default?: boolean }[];
  tags: { name: string }[];
  initialRef?: string;
}

async function fetchPipelineTriggerRefs(projectId: number, defaultRef?: string): Promise<PipelineTriggerRefs> {
  const [branches, tags] = await Promise.all([
    gitlab.getProjectBranches(projectId),
    gitlab.getProjectTags(projectId).catch(() => [] as { name: string }[]),
  ]);
  const fallback = branches.find((branch) => branch.default)?.name ?? branches[0]?.name;
  const inBranches = defaultRef && branches.some((branch) => branch.name === defaultRef);
  const inTags = defaultRef && tags.some((tag) => tag.name === defaultRef);
  return {
    branches,
    tags,
    initialRef: inBranches || inTags ? defaultRef : fallback,
  };
}

export function PipelineTriggerForm(props: { projectId: number; defaultRef?: string }) {
  const { pop } = useNavigation();
  const [refValue, setRefValue] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const {
    data: refs,
    isLoading: refsLoading,
    error: refsError,
  } = useCachedPromise(fetchPipelineTriggerRefs, [props.projectId, props.defaultRef]);

  async function handleSubmit(values: Record<string, string>) {
    if (!values.ref || values.ref.length === 0) {
      showFailureToast("Pick a branch or tag", { title: "Cannot trigger pipeline" });
      return;
    }
    const variables: { key: string; value: string }[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < VARIABLE_SLOTS; index++) {
      const key = (values[`var_key_${index}`] || "").trim();
      const value = values[`var_value_${index}`] ?? "";
      if (key.length === 0) continue;
      if (seen.has(key)) {
        showFailureToast(`Duplicate variable key "${key}"`, { title: "Cannot trigger pipeline" });
        return;
      }
      seen.add(key);
      variables.push({ key, value });
    }
    setSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Triggering pipeline..." });
      const result = await gitlab.triggerPipeline(props.projectId, values.ref, variables);
      showToast({
        style: Toast.Style.Success,
        title: "Pipeline triggered",
        message: result.id ? `#${result.id}` : undefined,
      });
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to trigger pipeline" });
    } finally {
      setSubmitting(false);
    }
  }

  if (refsError) {
    return (
      <Form>
        <Form.Description title="Error" text={getErrorMessage(refsError)} />
      </Form>
    );
  }

  const branches = refs?.branches ?? [];
  const tags = refs?.tags ?? [];

  return (
    <Form
      isLoading={refsLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Trigger Pipeline" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="ref" title="Ref" value={refValue ?? refs?.initialRef} onChange={setRefValue} storeValue>
        {branches.length > 0 && (
          <Form.Dropdown.Section title="Branches">
            {branches.map((branch) => (
              <Form.Dropdown.Item
                key={`b-${branch.name}`}
                value={branch.name}
                title={branch.default ? `${branch.name} (default)` : branch.name}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {tags.length > 0 && (
          <Form.Dropdown.Section title="Tags">
            {tags.map((tag) => (
              <Form.Dropdown.Item key={`t-${tag.name}`} value={tag.name} title={tag.name} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.Description text="Optional CI/CD variables (env_var). Leave a key empty to skip the slot." />
      {Array.from({ length: VARIABLE_SLOTS }).flatMap((_, index) => [
        <Form.Separator key={`sep-${index}`} />,
        <Form.TextField
          key={`k-${index}`}
          id={`var_key_${index}`}
          title={`Variable ${index + 1} Key`}
          placeholder="MY_VAR"
        />,
        <Form.TextField
          key={`v-${index}`}
          id={`var_value_${index}`}
          title={`Variable ${index + 1} Value`}
          placeholder="value"
        />,
      ])}
    </Form>
  );
}
