import { Action, ActionPanel, Form, Toast, showToast, useNavigation, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { SurveyQuestion, SurveySpec, authHeaders } from "../common/awx";

/**
 * Launch a job template or workflow.
 *
 * If `surveyEndpoint` is given and the target has a survey, its questions are
 * rendered as form fields and submitted as `extra_vars`. Otherwise a free-form
 * extra-variables editor is shown.
 */
export function LaunchForm({
  name,
  submitTitle = "Launch",
  launch,
  jobUrl,
  surveyEndpoint,
  onLaunched,
}: {
  name: string;
  submitTitle?: string;
  launch: (extraVars: string) => Promise<{ id: number; ignored_fields?: Record<string, unknown> }>;
  jobUrl: (id: number) => string;
  surveyEndpoint?: string;
  onLaunched?: () => void;
}) {
  const { pop } = useNavigation();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [jsonError, setJsonError] = useState<string | undefined>();

  const { data: survey, isLoading } = useFetch<SurveySpec>(surveyEndpoint ?? "", {
    headers: authHeaders(),
    execute: Boolean(surveyEndpoint),
  });

  const questions = survey?.spec ?? [];
  const hasSurvey = questions.length > 0;

  function clearError(variable: string) {
    setErrors((prev) => (prev[variable] ? { ...prev, [variable]: undefined } : prev));
  }

  async function submit(values: Form.Values) {
    let extraVars: string;

    if (hasSurvey) {
      const nextErrors: Record<string, string | undefined> = {};
      const answers: Record<string, unknown> = {};
      for (const q of questions) {
        const raw = values[q.variable];
        const isEmpty = raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0);
        // An omitted answer is fine when the question has a default: AWX applies it
        // server-side. This matters for password questions, whose defaults arrive
        // masked ("$encrypted$") and so can never be prefilled into the form.
        const hasDefault = Array.isArray(q.default) ? q.default.length > 0 : q.default != null && q.default !== "";
        if (q.required && isEmpty && !hasDefault) {
          nextErrors[q.variable] = "This field is required";
          continue;
        }
        if (isEmpty) continue;
        if (q.type === "integer" || q.type === "float") {
          const rawText = String(raw).trim();
          const isValidNumber =
            q.type === "integer"
              ? /^[-+]?\d+$/.test(rawText)
              : /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(rawText);
          if (!isValidNumber) {
            nextErrors[q.variable] = "Must be a number";
            continue;
          }
          const num = q.type === "integer" ? Number.parseInt(rawText, 10) : Number.parseFloat(rawText);
          // The survey spec carries numeric bounds; AWX rejects violations with a 400.
          if (q.min != null && num < q.min) {
            nextErrors[q.variable] = `Must be at least ${q.min}`;
            continue;
          }
          if (q.max != null && num > q.max) {
            nextErrors[q.variable] = `Must be at most ${q.max}`;
            continue;
          }
          answers[q.variable] = num;
        } else {
          // For text-like questions min/max are length bounds.
          if (typeof raw === "string" && ["text", "textarea", "password"].includes(q.type)) {
            if (q.min != null && q.min > 0 && raw.length < q.min) {
              nextErrors[q.variable] = `Must be at least ${q.min} characters`;
              continue;
            }
            if (q.max != null && raw.length > q.max) {
              nextErrors[q.variable] = `Must be at most ${q.max} characters`;
              continue;
            }
          }
          answers[q.variable] = raw;
        }
      }
      if (Object.values(nextErrors).some(Boolean)) {
        setErrors(nextErrors);
        await showToast({ style: Toast.Style.Failure, title: "Please fill in the required fields" });
        return;
      }
      extraVars = JSON.stringify(answers);
    } else {
      extraVars = (values.extraVars as string) ?? "";
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Launching "${name}"…` });
    try {
      const job = await launch(extraVars);
      const ignored = job.ignored_fields ? Object.keys(job.ignored_fields) : [];
      if (ignored.length > 0) {
        // The job launched, but AWX dropped our variables — surface it instead of a plain success.
        toast.style = Toast.Style.Failure;
        toast.title = `Launched #${job.id}, but variables were ignored`;
        toast.message = `AWX ignored: ${ignored.join(", ")}. Enable "Prompt on launch" or a survey on this template to accept them.`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `Launched #${job.id}`;
      }
      toast.primaryAction = { title: "Open in AWX", onAction: () => open(jobUrl(job.id)) };
      // Only leave the form on a clean launch; if AWX ignored variables, stay so the user can correct.
      if (ignored.length === 0) {
        onLaunched?.();
        pop();
      }
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Launch failed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Launch ${name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Target" text={name} />
      {hasSurvey ? (
        questions.map((q) => renderSurveyField(q, errors[q.variable], () => clearError(q.variable)))
      ) : (
        <Form.TextArea
          id="extraVars"
          title="Extra Variables"
          placeholder={"key: value\nanother_key: 123\n\n(YAML or JSON — leave empty to use defaults)"}
          error={jsonError}
          onChange={() => setJsonError(undefined)}
          onBlur={(event) => {
            const value = event.target.value ?? "";
            if (!value.trim()) return;
            // Best-effort validation: JSON must parse; YAML is passed through to AWX.
            if (value.trim().startsWith("{")) {
              try {
                JSON.parse(value);
              } catch {
                setJsonError("Invalid JSON");
              }
            }
          }}
        />
      )}
    </Form>
  );
}

function renderSurveyField(q: SurveyQuestion, error: string | undefined, onChange: () => void) {
  const title = q.question_name || q.variable;
  const info = q.question_description || undefined;
  const defaultText = q.default != null && !Array.isArray(q.default) ? String(q.default) : undefined;

  switch (q.type) {
    case "textarea":
    case "json":
      return (
        <Form.TextArea
          key={q.variable}
          id={q.variable}
          title={title}
          info={info}
          error={error}
          defaultValue={defaultText}
          onChange={onChange}
        />
      );
    case "password":
      return (
        <Form.PasswordField
          key={q.variable}
          id={q.variable}
          title={title}
          info={info}
          error={error}
          onChange={onChange}
        />
      );
    case "multiplechoice":
      return (
        <Form.Dropdown
          key={q.variable}
          id={q.variable}
          title={title}
          info={info}
          error={error}
          defaultValue={defaultText}
          onChange={onChange}
        >
          {toChoices(q.choices).map((c) => (
            <Form.Dropdown.Item key={c} value={c} title={c} />
          ))}
        </Form.Dropdown>
      );
    case "multiselect":
      return (
        <Form.TagPicker
          key={q.variable}
          id={q.variable}
          title={title}
          info={info}
          error={error}
          defaultValue={toDefaultArray(q.default)}
          onChange={onChange}
        >
          {toChoices(q.choices).map((c) => (
            <Form.TagPicker.Item key={c} value={c} title={c} />
          ))}
        </Form.TagPicker>
      );
    case "integer":
    case "float":
      return (
        <Form.TextField
          key={q.variable}
          id={q.variable}
          title={title}
          info={info}
          error={error}
          placeholder="number"
          defaultValue={defaultText}
          onChange={onChange}
        />
      );
    default:
      return (
        <Form.TextField
          key={q.variable}
          id={q.variable}
          title={title}
          info={info}
          error={error}
          defaultValue={defaultText}
          onChange={onChange}
        />
      );
  }
}

function toChoices(choices?: string | string[]): string[] {
  if (!choices) return [];
  const list = Array.isArray(choices) ? choices : choices.split("\n");
  return list.map((c) => c.trim()).filter(Boolean);
}

function toDefaultArray(def?: string | number | string[]): string[] | undefined {
  if (def == null || def === "") return undefined;
  if (Array.isArray(def)) return def;
  return String(def)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
