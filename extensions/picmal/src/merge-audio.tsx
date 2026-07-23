import { Action, ActionPanel, Detail, Form, Icon, popToRoot } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { isPicmalInstalled } from "./lib/cli";
import { runAndReport } from "./lib/feedback";
import { selectedFinderPaths } from "./lib/finder";

interface MergeAudioFormValues {
  input: string[];
  overwrite: boolean;
}

/** Audio extensions picmal-cli accepts as merge inputs (mirrors Constants.audioFormats). */
const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".aac",
  ".m4a",
  ".flac",
  ".ogg",
  ".oga",
  ".opus",
  ".m4r",
  ".ac3",
  ".wv",
  ".au",
  ".caf",
  ".spx",
  ".ircam",
  ".snd",
  ".voc",
  ".dts",
  ".tta",
  ".w64",
  ".sln",
  ".hcom",
  ".paf",
  ".mp2",
  ".wve",
  ".nist",
  ".aiff",
  ".aif",
  ".aifc",
  ".avr",
  ".pvf",
  ".wma",
  ".eac3",
  ".mka",
  ".ape",
  ".mpc",
  ".tak",
  ".dsf",
  ".shn",
  ".amr",
  ".gsm",
];

/** Keep only the audio files from a list of paths (case-insensitive extension match). */
function audioOnly(paths: string[]): string[] {
  return paths.filter((path) => AUDIO_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext)));
}

export default function MergeAudio() {
  // Deferred so Spotlight (mdfind) never runs on the synchronous render path.
  const { data: installed } = usePromise(async () => isPicmalInstalled());
  const { data: finderPaths, isLoading: loadingFinder } = usePromise(selectedFinderPaths);

  const { handleSubmit, itemProps, setValue, values } = useForm<MergeAudioFormValues>({
    async onSubmit(values) {
      await runAndReport("merge-audio", {
        input: audioOnly(values.input),
        overwrite: values.overwrite,
      });
      await popToRoot();
    },
    initialValues: { input: [], overwrite: false },
    validation: {
      input: (value) => {
        const audio = audioOnly(value ?? []);
        if (audio.length < 2) return "Select at least two audio files";
        return undefined;
      },
    },
  });

  // Prefill the file picker with the audio files in the current Finder selection.
  useEffect(() => {
    const audio = audioOnly(finderPaths ?? []);
    if (audio.length > 0) setValue("input", audio);
  }, [finderPaths]);

  if (installed === undefined) return <Detail isLoading />;
  if (!installed) return <NotInstalled />;

  const selectedAudio = audioOnly(values.input ?? []);
  const prefilledCount = audioOnly(finderPaths ?? []).length;

  return (
    <Form
      isLoading={loadingFinder}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Merge Audio" icon={Icon.Music} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker {...itemProps.input} title="Audio Files" allowMultipleSelection />
      <Form.Description
        title="Order"
        text={
          selectedAudio.length >= 2
            ? `Joined top-to-bottom into one file — ${selectedAudio.length} files in this order.`
            : "Pick two or more audio files. They join in the order shown, top to bottom."
        }
      />
      {prefilledCount > 0 && (
        <Form.Description
          title="From Finder"
          text={`Prefilled ${prefilledCount} audio file${prefilledCount === 1 ? "" : "s"}`}
        />
      )}
      <Form.Separator />
      <Form.Checkbox {...itemProps.overwrite} label="Overwrite existing files" />
    </Form>
  );
}
