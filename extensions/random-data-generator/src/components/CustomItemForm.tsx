import { useMemo, useState } from "react";

import { AI, Action, ActionPanel, Form, Icon, Toast, environment, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

import { INVALID_AI_ANSWER, buildPrompt, parseAiAnswer } from "@/ai";
import { CustomItem, createCustomItemId, renderTemplate } from "@/customItems";

type FormValues = { prompt: string; name: string; template: string };

interface CustomItemFormProps {
  item?: CustomItem;
  initialPrompt?: string;
  availableMethods: string[];
  onSave: (item: CustomItem) => void;
}

const TEMPLATE_INFO = [
  "Use {{module.method}} tags, optionally with a strict JSON argument, and any literal text around them.",
  'Examples: {{number.int({"min":5,"max":10})}} or {{person.firstName}} {{person.lastName}} <{{internet.email}}>',
].join("\n");

function preview(template: string): { value?: string; error?: string } {
  if (!template.trim()) return {};
  try {
    return { value: renderTemplate(template) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export default function CustomItemForm({ item, initialPrompt, availableMethods, onSave }: CustomItemFormProps) {
  const { pop } = useNavigation();
  const [isGenerating, setIsGenerating] = useState(false);
  const canUseAI = environment.canAccess(AI);

  const { handleSubmit, itemProps, values, setValue, focus } = useForm<FormValues>({
    initialValues: { prompt: initialPrompt ?? "", name: item?.name ?? "", template: item?.template ?? "" },
    validation: {
      name: FormValidation.Required,
      template: (value) => {
        if (!value?.trim()) return "The item is required";
        return preview(value).error;
      },
    },
    onSubmit: (formValues) => {
      onSave({ id: item?.id ?? createCustomItemId(), name: formValues.name.trim(), template: formValues.template });
      pop();
    },
  });

  const templatePreview = useMemo(() => preview(values.template), [values.template]);

  const generateWithAI = async () => {
    const description = values.prompt.trim();
    if (!description) {
      focus("prompt");
      await showToast({ style: Toast.Style.Failure, title: "Describe the data you want first" });
      return;
    }

    setIsGenerating(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Generating template…" });

    try {
      let previousError: string | undefined;
      let answer: ReturnType<typeof parseAiAnswer>;

      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await AI.ask(buildPrompt(description, availableMethods, previousError), { creativity: "low" });
        answer = parseAiAnswer(response);
        previousError = answer ? preview(answer.template).error : INVALID_AI_ANSWER;
        if (!previousError) break;
      }

      if (!answer) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not generate template";
        toast.message = previousError;
        return;
      }

      setValue("template", answer.template);
      // Read the latest name rather than the closure snapshot, since the user may have typed one while waiting.
      const generatedName = answer.name;
      if (generatedName) setValue("name", (current) => (current.trim() ? current : generatedName));

      if (previousError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Generated template is invalid";
        toast.message = previousError;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Template generated";
      }
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could not generate template" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Enter runs the first action, so generating becomes primary while a description is typed and no template exists yet.
  const generateIsPrimary = canUseAI && values.prompt.trim().length > 0 && values.template.trim().length === 0;
  const generateAction = (
    <Action
      title="Generate with AI"
      icon={Icon.Stars}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "g" },
        Windows: { modifiers: ["ctrl", "shift"], key: "g" },
      }}
      onAction={generateWithAI}
    />
  );

  return (
    <Form
      isLoading={isGenerating}
      navigationTitle={item ? "Edit Custom Item" : "Create Custom Item"}
      actions={
        <ActionPanel>
          {generateIsPrimary && generateAction}
          <Action.SubmitForm title="Save Custom Item" icon={Icon.Check} onSubmit={handleSubmit} />
          {canUseAI && !generateIsPrimary && generateAction}
        </ActionPanel>
      }
    >
      {canUseAI ? (
        <Form.TextField
          title="Describe It"
          placeholder="e.g. integer between 5 and 10"
          info="Describe the data in plain language and press Enter to let Raycast AI write the template. Use ⌘⇧G to regenerate later."
          {...itemProps.prompt}
        />
      ) : (
        <Form.Description text="Generating templates from a description needs Raycast AI. You can still write the template by hand below." />
      )}
      <Form.TextField title="Name" placeholder="Integer 5-10" {...itemProps.name} />
      <Form.TextArea
        title="Template"
        placeholder='{{number.int({"min":5,"max":10})}}'
        info={TEMPLATE_INFO}
        {...itemProps.template}
      />
      {templatePreview.value !== undefined && <Form.Description title="Preview" text={templatePreview.value} />}
    </Form>
  );
}
