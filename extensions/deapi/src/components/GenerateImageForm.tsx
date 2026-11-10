import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { getClient } from "../lib/files";
import { generateImage } from "../lib/jobs";
import { ASPECT_RATIOS, sizeForAspectRatio, sortModels } from "../lib/models";
import { findModel, NO_MODELS_MESSAGE, showNoModelsToast, useModels } from "../lib/useModels";
import { JobView } from "./JobView";

interface Values {
  prompt: string;
  model: string;
  aspectRatio: string;
  seed: string;
}

export function GenerateImageForm(props: { initialPrompt?: string }) {
  const { push } = useNavigation();
  const { models, isLoading, noModels } = useModels(["txt2img"], (list) => sortModels(list, "txt2img"));

  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: { prompt: props.initialPrompt ?? "", aspectRatio: "1:1", seed: "" },
    validation: {
      prompt: (value) => (!value?.trim() ? "Describe the image" : undefined),
      seed: (value) => (value && !/^\d+$/.test(value) ? "Use a whole number, or leave it empty" : undefined),
    },
    onSubmit: (submitted) => {
      const model = findModel(models, submitted.model);
      if (!model) {
        showNoModelsToast();
        return;
      }
      const ratio = ASPECT_RATIOS.find((item) => item.id === submitted.aspectRatio)?.ratio ?? 1;
      const size = sizeForAspectRatio(model, ratio);
      const prompt = submitted.prompt.trim();
      push(
        <JobView
          kind="image"
          model={model.name}
          input={prompt}
          width={size.width}
          height={size.height}
          submit={() => generateImage(getClient(), { model, prompt, ...size, seed: submitted.seed })}
        />,
      );
    },
  });

  const model = findModel(models, values.model);
  const ratio = ASPECT_RATIOS.find((item) => item.id === values.aspectRatio)?.ratio ?? 1;
  const size = model ? sizeForAspectRatio(model, ratio) : undefined;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Image" icon={Icon.Image} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {noModels ? <Form.Description title="Unavailable" text={NO_MODELS_MESSAGE} /> : null}
      <Form.TextArea
        title="Prompt"
        placeholder="A red fox in the snow, golden hour, photorealistic"
        {...itemProps.prompt}
      />
      <Form.Dropdown title="Model" {...itemProps.model}>
        {models.map((item) => (
          <Form.Dropdown.Item key={item.slug} value={item.slug} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Aspect Ratio" {...itemProps.aspectRatio}>
        {ASPECT_RATIOS.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Seed"
        placeholder="Random"
        info="Use the same seed and prompt to get the same image."
        {...itemProps.seed}
      />
      {size ? <Form.Description title="Output" text={`${size.width} × ${size.height} pixels`} /> : null}
    </Form>
  );
}
