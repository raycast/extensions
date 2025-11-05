import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import buildPrompt from "../utils/buildPrompt";
import { creativity, FormValues, tones } from "../types";
import PreviewPrompt from "./PreviewPrompt";
import { validateForm } from "../utils/validation";
import { usePersistentForm } from "../hooks/usePersistentForm";

const PromptForm = () => {
  const { push } = useNavigation();
  const [taskError, setTaskError] = useState<string | undefined>();
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const { formValues, handleChange, resetForm } = usePersistentForm({
    role: "",
    task: "",
    reference: "",
    format: "",
    tone: "None",
    audience: "",
    creativity: "None",
    example: "",
    meta: "",
    reasoning: false,
    sources: false,
    summary: false,
    followup: false,
  });

  useEffect(() => {
    const hasAdvancedValues =
      formValues.example ||
      formValues.meta ||
      formValues.reasoning ||
      formValues.sources ||
      formValues.summary ||
      formValues.followup;

    if (hasAdvancedValues) setShowAdvanced(true);
  }, []);

  const validateAndGetPrompt = (values: FormValues): string | undefined => {
    const errors = validateForm(values);
    if (errors.task) {
      setTaskError(errors.task);
      return;
    }
    const generatedPrompt = buildPrompt(values);
    return generatedPrompt;
  };

  const handlePreviewPrompt = async (values: FormValues) => {
    const prompt = validateAndGetPrompt(values);
    if (!prompt) return;

    push(<PreviewPrompt prompt={prompt} />);
  };

  const handleCopyToClipboard = async (values: FormValues) => {
    try {
      const prompt = validateAndGetPrompt(values);
      if (!prompt) return;

      await Clipboard.copy(prompt);
      await showHUD("Copied to Clipboard");
    } catch (error) {
      await showHUD("Failed to Copy Prompt");
      console.log("Clipboard error:", error);
    }
  };

  return (
    <Form
      navigationTitle="Prompt Builder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy to Clipboard" onSubmit={handleCopyToClipboard} />
          <Action.SubmitForm
            title="Preview Prompt"
            icon={Icon.Eye}
            onSubmit={handlePreviewPrompt}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
          />
          <Action
            title="Clear All"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              resetForm();
              setTaskError(undefined);
              await showToast({
                style: Toast.Style.Success,
                title: "Form cleared",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Build your prompt (Preview with ⌘Y)" />

      <Form.TextField
        id="role"
        title="Role"
        placeholder="E.g. Data Scientist, Writer..."
        info="Who is the AI supposed to be?"
        value={formValues.role}
        onChange={(v) => handleChange("role", v)}
      />

      <Form.TextArea
        id="task"
        title="Task"
        placeholder="E.g. Summarize this article, Debug this function..."
        info="What should the AI do?"
        enableMarkdown
        error={taskError}
        value={formValues.task}
        onChange={(value) => {
          if (taskError && value.trim().length > 0) setTaskError(undefined);
          handleChange("task", value);
        }}
      />

      <Form.TextArea
        id="reference"
        title="Reference"
        placeholder="E.g. Text, data, code..."
        info="Provide context the AI can use"
        value={formValues.reference}
        onChange={(v) => handleChange("reference", v)}
      />

      <Form.TextArea
        id="format"
        title="Format / Constraints"
        placeholder="E.g. JSON, ≤200 words, Avoid jargon, keep it concise..."
        info="How should it answer? Separate multiple constraints with commas"
        value={formValues.format}
        onChange={(v) => handleChange("format", v)}
      />

      <Form.TextField
        id="audience"
        title="Audience"
        placeholder="E.g. Professors, Scientist, Young adults..."
        info="Who is it for?"
        value={formValues.audience}
        onChange={(v) => handleChange("audience", v)}
      />

      <Form.Dropdown
        id="tone"
        title="Tone"
        info="Choose the writing tone"
        value={formValues.tone}
        onChange={(v) => handleChange("tone", v)}
      >
        {tones.map((tone) => (
          <Form.Dropdown.Item key={tone} value={tone} title={tone} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="creativity"
        title="Creativity Level"
        info="Choose the creativity level"
        value={formValues.creativity}
        onChange={(v) => handleChange("creativity", v)}
      >
        {creativity.map((level) => (
          <Form.Dropdown.Item key={level} value={level} title={level} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="showAdvanced"
        label="Show advanced options"
        value={showAdvanced}
        onChange={(checked) => setShowAdvanced(checked)}
      />

      {showAdvanced && (
        <>
          <Form.Separator />

          <Form.TextArea
            id="example"
            title="Example"
            placeholder="E.g. Input → Output"
            info="Show the style you want"
            value={formValues.example}
            onChange={(v) => handleChange("example", v)}
          />

          <Form.TextArea
            id="meta"
            title="Meta Instructions"
            placeholder="E.g. Always think step-by-step before answering"
            info="Force extra rules or logic."
            value={formValues.meta}
            onChange={(v) => handleChange("meta", v)}
          />

          <Form.Checkbox
            id="reasoning"
            label="Include reasoning style"
            info="AI explains its thought process"
            value={formValues.reasoning}
            onChange={(v) => handleChange("reasoning", v)}
          />

          <Form.Checkbox
            id="sources"
            label="Include sources"
            info="AI provides sources or citations when possible"
            value={formValues.sources}
            onChange={(v) => handleChange("sources", v)}
          />

          <Form.Checkbox
            id="summary"
            label="End with a summary"
            info="AI concludes its answer with a brief recap"
            value={formValues.summary}
            onChange={(v) => handleChange("summary", v)}
          />

          <Form.Checkbox
            id="followup"
            label="Include follow-up suggestion"
            info="AI suggests next topic"
            value={formValues.followup}
            onChange={(v) => handleChange("followup", v)}
          />
        </>
      )}
    </Form>
  );
};

export default PromptForm;
