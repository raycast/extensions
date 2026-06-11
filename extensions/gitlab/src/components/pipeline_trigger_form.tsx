import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlab } from "../common";
import { Branch } from "../gitlabapi";
import { getErrorMessage, showErrorToast } from "../utils";

const VARIABLE_SLOTS = 3;

interface Tag {
  name: string;
}

export function PipelineTriggerForm(props: { projectID: number; defaultRef?: string }) {
  const { pop } = useNavigation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [refsLoading, setRefsLoading] = useState<boolean>(true);
  const [refsError, setRefsError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refValue, setRefValue] = useState<string | undefined>(undefined);

  useEffect(() => {
    let didUnmount = false;
    async function load() {
      try {
        const [b, t] = await Promise.all([
          gitlab.getProjectBranches(props.projectID),
          gitlab.getProjectTags(props.projectID).catch(() => [] as Tag[]),
        ]);
        if (didUnmount) return;
        setBranches(b);
        setTags(t);
        const fallback = b.find((x) => x.default)?.name ?? b[0]?.name;
        const inBranches = props.defaultRef && b.some((x) => x.name === props.defaultRef);
        const inTags = props.defaultRef && t.some((x) => x.name === props.defaultRef);
        const initial = inBranches || inTags ? props.defaultRef : fallback;
        setRefValue(initial);
      } catch (e) {
        if (!didUnmount) setRefsError(getErrorMessage(e));
      } finally {
        if (!didUnmount) setRefsLoading(false);
      }
    }
    load();
    return () => {
      didUnmount = true;
    };
  }, [props.projectID, props.defaultRef]);

  async function handleSubmit(values: Record<string, string>) {
    if (!values.ref || values.ref.length === 0) {
      showErrorToast("Pick a branch or tag", "Cannot trigger pipeline");
      return;
    }
    const variables: { key: string; value: string }[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < VARIABLE_SLOTS; i++) {
      const key = (values[`var_key_${i}`] || "").trim();
      const value = values[`var_value_${i}`] ?? "";
      if (key.length === 0) continue;
      if (seen.has(key)) {
        showErrorToast(`Duplicate variable key "${key}"`, "Cannot trigger pipeline");
        return;
      }
      seen.add(key);
      variables.push({ key, value });
    }
    setSubmitting(true);
    try {
      const result = await gitlab.triggerPipeline(props.projectID, values.ref, variables);
      await showToast({
        style: Toast.Style.Success,
        title: "Pipeline triggered",
        message: result.id ? `#${result.id}` : undefined,
      });
      pop();
    } catch (e) {
      showErrorToast(getErrorMessage(e), "Failed to trigger pipeline");
    } finally {
      setSubmitting(false);
    }
  }

  if (refsError) {
    return (
      <Form>
        <Form.Description title="Error" text={refsError} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={refsLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Trigger Pipeline" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="ref" title="Ref" value={refValue} onChange={setRefValue} storeValue>
        {branches.length > 0 && (
          <Form.Dropdown.Section title="Branches">
            {branches.map((b) => (
              <Form.Dropdown.Item
                key={`b-${b.name}`}
                value={b.name}
                title={b.default ? `${b.name} (default)` : b.name}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {tags.length > 0 && (
          <Form.Dropdown.Section title="Tags">
            {tags.map((t) => (
              <Form.Dropdown.Item key={`t-${t.name}`} value={t.name} title={t.name} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.Description text="Optional CI/CD variables (env_var). Leave a key empty to skip the slot." />
      {Array.from({ length: VARIABLE_SLOTS }).flatMap((_, i) => [
        <Form.Separator key={`sep-${i}`} />,
        <Form.TextField key={`k-${i}`} id={`var_key_${i}`} title={`Variable ${i + 1} Key`} placeholder="MY_VAR" />,
        <Form.TextField key={`v-${i}`} id={`var_value_${i}`} title={`Variable ${i + 1} Value`} placeholder="value" />,
      ])}
    </Form>
  );
}
