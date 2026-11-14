import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { basename } from "node:path";
import { getClient } from "../lib/files";
import { removeBackground, upscaleImage } from "../lib/jobs";
import { IMAGE_FILE_ERROR, isImageFile, sortModels } from "../lib/models";
import { findModel, NO_MODELS_MESSAGE, showNoModelsToast, useModels } from "../lib/useModels";
import { JobView } from "./JobView";

type Tool = "background" | "upscale";

const TOOLS = {
  background: {
    inferenceType: "img-rmbg" as const,
    submitTitle: "Remove Background",
    icon: Icon.Eraser,
    description: "Returns a PNG with a transparent background.",
  },
  upscale: {
    inferenceType: "img-upscale" as const,
    submitTitle: "Upscale Image",
    icon: Icon.Maximize,
    description: "Returns the image at four times the width and height.",
  },
};

interface Values {
  image: string[];
  model: string;
}

export function ImageToolForm(props: { tool: Tool; initialFile?: string }) {
  const tool = TOOLS[props.tool];
  const { push } = useNavigation();
  const { models, isLoading, noModels } = useModels([tool.inferenceType], (list) =>
    sortModels(list, tool.inferenceType),
  );

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { image: props.initialFile ? [props.initialFile] : [] },
    validation: {
      image: (value) => {
        if (!value?.length) return "Choose an image";
        if (!isImageFile(value[0])) return IMAGE_FILE_ERROR;
      },
    },
    onSubmit: (values) => {
      const model = findModel(models, values.model);
      if (!model) {
        showNoModelsToast();
        return;
      }
      const image = values.image[0];
      const submit =
        props.tool === "background"
          ? () => removeBackground(getClient(), { model: model.slug, image })
          : () => upscaleImage(getClient(), { model: model.slug, image });
      push(<JobView kind={props.tool} model={model.name} input={basename(image)} submit={submit} />);
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={tool.submitTitle} icon={tool.icon} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {noModels ? <Form.Description title="Unavailable" text={NO_MODELS_MESSAGE} /> : null}
      <Form.Description text={tool.description} />
      <Form.FilePicker title="Image" allowMultipleSelection={false} canChooseDirectories={false} {...itemProps.image} />
      {models.length > 1 ? (
        <Form.Dropdown title="Model" {...itemProps.model}>
          {models.map((item) => (
            <Form.Dropdown.Item key={item.slug} value={item.slug} title={item.name} />
          ))}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}
