import { Form } from "@raycast/api";
import { useState } from "react";
import { creativity, tones } from "../types";
import PromptFormActions from "./PromptFormActions";
import { useTemplate } from "../hooks/useTemplate";

const PromptForm = () => {
  const [taskError, setTaskError] = useState<string | undefined>();
  const {
    templates,
    formValues,
    selectedTemplateId,
    setSelectedTemplateId,
    handleChange,
    openTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    resetFormValues,
    deleteAllTemplates,
  } = useTemplate();

  const formState = { formValues, resetFormValues, setTaskError };
  const templateState = {
    selectedTemplateId,
    setSelectedTemplateId,
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    deleteAllTemplates,
  };

  return (
    <Form
      navigationTitle="Prompt Builder"
      actions={<PromptFormActions formState={formState} templateState={templateState} />}
    >
      <Form.Dropdown
        id="template"
        title="Use Template"
        value={selectedTemplateId}
        onChange={(templateId) => {
          openTemplate(templateId);
        }}
      >
        {templates.map((template) => {
          return <Form.Dropdown.Item key={template.id} value={template.id} title={template.title} />;
        })}
      </Form.Dropdown>

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

      <Form.Separator />

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
        id="noEmDash"
        label="Avoid em-dashes"
        info="AI tends to insert em-dashes. Enable this to avoid them."
        value={formValues.noEmDash}
        onChange={(v) => handleChange("noEmDash", v)}
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
    </Form>
  );
};

export default PromptForm;
