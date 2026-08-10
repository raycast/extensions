import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { RegexRule, RenameJob } from "../types";
import { JobStorage } from "../utils/storage";

interface EditJobFormProps {
  job: RenameJob;
  onJobSaved: () => void;
}

export default function EditJobForm({ job, onJobSaved }: EditJobFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [rules, setRules] = useState<RegexRule[]>(job.rules.map((rule) => ({ ...rule })));

  function addRule() {
    const newRule: RegexRule = {
      id: `rule-${Date.now()}`,
      find: "",
      replace: "",
      flags: "g",
      description: "",
    };
    setRules([...rules, newRule]);
  }

  // Remove rule functionality to be added later

  function updateRule(ruleId: string, field: keyof RegexRule, value: string) {
    setRules(rules.map((rule) => (rule.id === ruleId ? { ...rule, [field]: value } : rule)));
  }

  async function handleSubmit(values: { name: string; description?: string }) {
    if (!values.name?.trim()) {
      setNameError("Name is required");
      return;
    }

    // Validate regex patterns
    const validRules: RegexRule[] = [];
    for (const rule of rules) {
      if (rule.find.trim()) {
        try {
          new RegExp(rule.find, rule.flags || "g");
          validRules.push({
            ...rule,
            find: rule.find.trim(),
            replace: rule.replace || "",
            flags: rule.flags || "g",
            description: rule.description?.trim() || `Rule ${validRules.length + 1}`,
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid regex pattern",
            message: `Rule "${rule.description || rule.find}": ${error instanceof Error ? error.message : "Invalid pattern"}`,
          });
          return;
        }
      }
    }

    if (validRules.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid rules",
        message: "Please add at least one rule with a find pattern",
      });
      return;
    }

    const updatedJob: RenameJob = {
      ...job,
      name: values.name.trim(),
      description: values.description?.trim(),
      rules: validRules,
      updatedAt: new Date(),
    };

    try {
      await JobStorage.saveJob(updatedJob);
      await showToast({
        style: Toast.Style.Success,
        title: "Job updated",
        message: `"${updatedJob.name}" updated with ${validRules.length} rules`,
      });
      onJobSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update job",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle={`Edit "${job.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
          <Action title="Add Rule" onAction={addRule} shortcut={{ modifiers: ["cmd"], key: "+" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Job Name"
        placeholder="Enter job name"
        defaultValue={job.name}
        error={nameError}
        onChange={(value) => setNameError(value?.trim() ? undefined : "Name is required")}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        defaultValue={job.description}
      />

      <Form.Separator />

      {rules
        .map((rule, index) => [
          <Form.Description key={`desc-${rule.id}`} title={`Rule ${index + 1}`} text="" />,
          <Form.TextField
            key={`find-${rule.id}`}
            id={`find-${rule.id}`}
            title="Find Pattern (Regex)"
            placeholder="Regular expression to find"
            value={rule.find}
            onChange={(value) => updateRule(rule.id, "find", value)}
          />,
          <Form.TextField
            key={`replace-${rule.id}`}
            id={`replace-${rule.id}`}
            title="Replace With"
            placeholder="Replacement text (use $1, $2 for groups)"
            value={rule.replace}
            onChange={(value) => updateRule(rule.id, "replace", value)}
          />,
          <Form.TextField
            key={`flags-${rule.id}`}
            id={`flags-${rule.id}`}
            title="Flags"
            placeholder="g, i, m, etc."
            value={rule.flags}
            onChange={(value) => updateRule(rule.id, "flags", value)}
          />,
          <Form.TextField
            key={`desc-field-${rule.id}`}
            id={`description-${rule.id}`}
            title="Description"
            placeholder="What this rule does"
            value={rule.description}
            onChange={(value) => updateRule(rule.id, "description", value)}
          />,
          ...(rules.length > 1
            ? [<Form.Description key={`remove-${rule.id}`} text={`Rule ${index + 1} configured`} />]
            : []),
        ])
        .flat()}
    </Form>
  );
}
