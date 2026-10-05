import { Action, ActionPanel, Detail, Form, Icon, popToRoot } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { isPicmalInstalled } from "./lib/cli";
import { runAndReport } from "./lib/feedback";
import { selectedFinderPaths } from "./lib/finder";

interface CombineVideosFormValues {
  input: string[];
  overwrite: boolean;
}

/** Video extensions picmal-cli accepts as combine inputs (mirrors Constants.videoFormats). */
const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".flv",
  ".wmv",
  ".m4v",
  ".mpg",
  ".mpeg",
  ".3gp",
  ".3g2",
  ".m2ts",
  ".mts",
  ".vob",
  ".asf",
  ".ogv",
  ".wtv",
  ".ts",
  ".mjpeg",
  ".m2v",
  ".hevc",
  ".f4v",
  ".mxf",
  ".mod",
  ".rm",
  ".rmvb",
  ".bik",
  ".fli",
  ".flc",
  ".nsv",
  ".dav",
];

/** Keep only the video files from a list of paths (case-insensitive extension match). */
function videoOnly(paths: string[]): string[] {
  return paths.filter((path) => VIDEO_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext)));
}

export default function CombineVideos() {
  // Deferred so Spotlight (mdfind) never runs on the synchronous render path.
  const { data: installed } = usePromise(async () => isPicmalInstalled());
  const { data: finderPaths, isLoading: loadingFinder } = usePromise(selectedFinderPaths);

  const { handleSubmit, itemProps, setValue, values } = useForm<CombineVideosFormValues>({
    async onSubmit(values) {
      await runAndReport("combine-videos", {
        input: videoOnly(values.input),
        overwrite: values.overwrite,
      });
      await popToRoot();
    },
    initialValues: { input: [], overwrite: false },
    validation: {
      input: (value) => {
        const videos = videoOnly(value ?? []);
        if (videos.length < 2) return "Select at least two videos";
        return undefined;
      },
    },
  });

  // Prefill the file picker with the videos in the current Finder selection.
  useEffect(() => {
    const videos = videoOnly(finderPaths ?? []);
    if (videos.length > 0) setValue("input", videos);
  }, [finderPaths]);

  if (installed === undefined) return <Detail isLoading />;
  if (!installed) return <NotInstalled />;

  const selectedVideos = videoOnly(values.input ?? []);
  const prefilledCount = videoOnly(finderPaths ?? []).length;

  return (
    <Form
      isLoading={loadingFinder}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Combine Videos" icon={Icon.Video} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker {...itemProps.input} title="Videos" allowMultipleSelection />
      <Form.Description
        title="Order"
        text={
          selectedVideos.length >= 2
            ? `Joined top-to-bottom into one file — ${selectedVideos.length} videos in this order.`
            : "Pick two or more videos. They join in the order shown, top to bottom."
        }
      />
      {prefilledCount > 0 && (
        <Form.Description
          title="From Finder"
          text={`Prefilled ${prefilledCount} video${prefilledCount === 1 ? "" : "s"}`}
        />
      )}
      <Form.Separator />
      <Form.Checkbox {...itemProps.overwrite} label="Overwrite existing files" />
    </Form>
  );
}
