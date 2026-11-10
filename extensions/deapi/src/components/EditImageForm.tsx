import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { getClient } from "../lib/files";
import { editImage } from "../lib/jobs";
import { IMAGE_FILE_ERROR, isImageFile, sortModels } from "../lib/models";
import { findModel, useModels } from "../lib/useModels";
import { JobView } from "./JobView";

interface Values {
  images: string[];
  prompt: string;
  model: string;
  seed: string;
}

const MAX_IMAGES = 3;

export function EditImageForm(props: { initialFile?: string }) {
  const { push } = useNavigation();
  const { models, isLoading } = useModels(["img2img"], (list) => sortModels(list, "img2img"));

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { images: props.initialFile ? [props.initialFile] : [], prompt: "", seed: "" },
    validation: {
      images: (value) => {
        if (!value?.length) return "Choose an image";
        if (value.length > MAX_IMAGES) return `Choose up to ${MAX_IMAGES} images`;
        if (!value.every(isImageFile)) return IMAGE_FILE_ERROR;
      },
      prompt: (value) => (!value?.trim() ? "Describe the change" : undefined),
      seed: (value) => (value && !/^\d+$/.test(value) ? "Use a whole number, or leave it empty" : undefined),
    },
    onSubmit: (values) => {
      const model = findModel(models, values.model);
      if (!model) return;
      const prompt = values.prompt.trim();
      push(
        <JobView
          kind="edit"
          model={model.name}
          input={prompt}
          submit={() => editImage(getClient(), { model, prompt, images: values.images, seed: values.seed })}
        />,
      );
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Image" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Images"
        allowMultipleSelection
        canChooseDirectories={false}
        info="The image to change. Add up to two more as references, for example a product or a style."
        {...itemProps.images}
      />
      <Form.TextArea
        title="Instruction"
        placeholder="Make it a rainy night with neon reflections"
        {...itemProps.prompt}
      />
      <Form.Dropdown title="Model" {...itemProps.model}>
        {models.map((item) => (
          <Form.Dropdown.Item key={item.slug} value={item.slug} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Seed" placeholder="Random" {...itemProps.seed} />
    </Form>
  );
}
