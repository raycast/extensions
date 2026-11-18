import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { getClient } from "../lib/files";
import { generateVideo } from "../lib/jobs";
import {
  ASPECT_RATIOS,
  defaultVideoDuration,
  IMAGE_FILE_ERROR,
  isImageFile,
  sizeForAspectRatio,
  sortModels,
  videoDurations,
} from "../lib/models";
import { findModel, NO_MODELS_MESSAGE, showNoModelsToast, useModels } from "../lib/useModels";
import { JobView } from "./JobView";

interface Values {
  prompt: string;
  image: string[];
  model: string;
  aspectRatio: string;
  seconds: string;
}

export function GenerateVideoForm(props: { initialImage?: string; initialPrompt?: string }) {
  const { push } = useNavigation();
  const {
    models: allModels,
    isLoading,
    noModels,
  } = useModels(["txt2video", "img2video"], (list) => sortModels(list, "video"));

  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: {
      prompt: props.initialPrompt ?? "",
      image: props.initialImage ? [props.initialImage] : [],
      aspectRatio: "16:9",
    },
    validation: {
      prompt: (value) => (!value?.trim() ? "Describe the video" : undefined),
      image: (value) => (value?.length && !isImageFile(value[0]) ? IMAGE_FILE_ERROR : undefined),
    },
    onSubmit: (submitted) => {
      const image = submitted.image?.[0];
      const model = findModel(modelsFor(image), submitted.model);
      if (!model) {
        showNoModelsToast();
        return;
      }
      const size = sizeForAspectRatio(
        model,
        ASPECT_RATIOS.find((item) => item.id === submitted.aspectRatio)?.ratio ?? 1,
      );
      const duration =
        videoDurations(model).find((item) => String(item.seconds) === submitted.seconds) ?? defaultVideoDuration(model);
      const prompt = submitted.prompt.trim();
      push(
        <JobView
          kind="video"
          model={model.name}
          input={prompt}
          width={size.width}
          height={size.height}
          submit={() =>
            generateVideo(getClient(), {
              model,
              prompt,
              ...size,
              frames: duration.frames,
              fps: duration.fps,
              image,
            })
          }
        />,
      );
    },
  });

  function modelsFor(image?: string) {
    return allModels.filter((model) => model.inference_types.includes(image ? "img2video" : "txt2video"));
  }

  const models = modelsFor(values.image?.[0]);
  const model = findModel(models, values.model);
  const durations = model ? videoDurations(model) : [];
  const defaultSeconds = model ? String(defaultVideoDuration(model)?.seconds ?? "") : "";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Video" icon={Icon.FilmStrip} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {noModels ? <Form.Description title="Unavailable" text={NO_MODELS_MESSAGE} /> : null}
      <Form.TextArea
        title="Prompt"
        placeholder="A paper boat drifting down a rainy street, slow camera pan"
        {...itemProps.prompt}
      />
      <Form.FilePicker
        title="First Frame"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Optional. Choose an image to animate it instead of starting from text only."
        {...itemProps.image}
      />
      <Form.Dropdown id="model" title="Model" value={model?.slug ?? ""} onChange={itemProps.model.onChange}>
        {models.map((item) => (
          <Form.Dropdown.Item key={item.slug} value={item.slug} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Aspect Ratio" {...itemProps.aspectRatio}>
        {ASPECT_RATIOS.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="seconds"
        title="Length"
        value={durations.some((item) => String(item.seconds) === values.seconds) ? values.seconds : defaultSeconds}
        onChange={itemProps.seconds.onChange}
      >
        {durations.map((item) => (
          <Form.Dropdown.Item key={item.seconds} value={String(item.seconds)} title={`${item.seconds} seconds`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
