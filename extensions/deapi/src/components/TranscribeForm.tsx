import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { basename } from "node:path";
import { getClient } from "../lib/files";
import { transcribe } from "../lib/jobs";
import { isSupportedLink, isVideoFile, sortModels } from "../lib/models";
import { findModel, useModels } from "../lib/useModels";
import { JobView } from "./JobView";

interface Values {
  link: string;
  file: string[];
  model: string;
  timestamps: boolean;
}

export function TranscribeForm(props: { initialLink?: string }) {
  const { push } = useNavigation();
  const { models, isLoading } = useModels(["video2text", "audio_file2text"], (list) =>
    sortModels(list, "transcription"),
  );

  const { handleSubmit, itemProps, values, setValidationError } = useForm<Values>({
    initialValues: { link: props.initialLink ?? "", file: [], timestamps: false },
    validation: {
      link: (value) => {
        if (!value?.trim()) return undefined;
        if (!isSupportedLink(value.trim())) return "Use a YouTube, X, TikTok, Twitch or Kick link";
      },
    },
    onSubmit: (submitted) => {
      const link = submitted.link?.trim();
      const file = submitted.file?.[0];
      if (!link && !file) {
        setValidationError("link", "Paste a link or choose a file");
        return;
      }
      const model = findModel(models, submitted.model);
      if (!model) return;
      const source = link || basename(file as string);
      push(
        <JobView
          kind="transcription"
          model={model.name}
          input={source}
          submit={() =>
            transcribe(getClient(), {
              model: model.slug,
              link: link || undefined,
              file: link ? undefined : file,
              timestamps: submitted.timestamps,
            })
          }
        />,
      );
    },
  });

  const needsSource = !values.link?.trim() && !values.file?.length;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe" icon={Icon.Text} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Link"
        placeholder="https://www.youtube.com/watch?v=…"
        info="A public YouTube, X (Twitter), TikTok, Twitch or Kick video."
        {...itemProps.link}
      />
      <Form.FilePicker
        title="Or a File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="An audio or video file, such as MP3, WAV, M4A or MP4."
        {...itemProps.file}
      />
      {needsSource ? <Form.Description text="Paste a link or choose a file." /> : null}
      {values.file?.[0] && isVideoFile(values.file[0]) ? (
        <Form.Description text="Video files are uploaded in full, so large files take a while." />
      ) : null}
      <Form.Checkbox label="Include timestamps" {...itemProps.timestamps} />
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
