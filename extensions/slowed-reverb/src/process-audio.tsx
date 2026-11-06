import { Action, ActionPanel, Form, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "node:path";
import { useRef, useState } from "react";
import { processAudio } from "./audio";
import { formats, getDefaultFormat, getDefaultSpeed, isOutputFormat, isPreset, Preset, presets } from "./audio-options";

type Values = {
  files: string[];
  format: string;
  speed?: string;
  reverb?: string;
  outputDirectory?: string[];
};

function Results({ results }: { results: Awaited<ReturnType<typeof processAudio>> }) {
  const saved = results.filter((result) => result.status === "success");
  const failed = results.filter((result) => result.status === "failure");

  return (
    <List navigationTitle="Audio Results" searchBarPlaceholder="Filter results">
      {saved.length > 0 && (
        <List.Section title="Saved" subtitle={String(saved.length)}>
          {saved.map(({ outputPath }) => (
            <List.Item
              key={outputPath}
              icon={Icon.Music}
              title={path.basename(outputPath)}
              subtitle={path.dirname(outputPath)}
              actions={
                <ActionPanel>
                  <Action.Open title="Open Audio File" target={outputPath} />
                  <Action.ShowInFinder path={outputPath} />
                  <Action.CopyToClipboard title="Copy Output Path" content={outputPath} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {failed.length > 0 && (
        <List.Section title="Failed" subtitle={String(failed.length)}>
          {failed.map(({ inputPath, error }) => (
            <List.Item
              key={inputPath}
              icon={Icon.ExclamationMark}
              title={path.basename(inputPath)}
              subtitle={error}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Error" content={`${inputPath}\n${error}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command({ launchContext }: LaunchProps<{ launchContext?: { preset?: string } }>) {
  const initialPreset = launchContext?.preset;
  const [preset, setPreset] = useState<Preset>(
    initialPreset && isPreset(initialPreset) ? initialPreset : "slowed-reverb",
  );
  const [speed, setSpeed] = useState(() => String(getDefaultSpeed(preset)));
  const [progress, setProgress] = useState<string>();
  const busy = useRef(false);
  const { push } = useNavigation();
  const { rateEffect, reverb } = presets[preset];

  async function submit(values: Values) {
    if (busy.current) return;
    busy.current = true;
    setProgress("Preparing audio…");
    try {
      if (!isOutputFormat(values.format)) throw new Error("Choose an output format.");
      const results = await processAudio(
        values.files ?? [],
        {
          preset,
          format: values.format,
          speed: rateEffect && values.speed?.trim() ? Number(values.speed) : undefined,
          reverb: reverb && values.reverb?.trim() ? Number(values.reverb) : undefined,
          outputDirectory: values.outputDirectory?.[0],
        },
        (current, total) => setProgress(`Processing file ${current} of ${total}…`),
      );
      push(<Results results={results} />);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Process Audio" });
    } finally {
      busy.current = false;
      setProgress(undefined);
    }
  }

  return (
    <Form
      isLoading={Boolean(progress)}
      actions={
        progress ? undefined : (
          <ActionPanel>
            <Action.SubmitForm title="Process Audio" onSubmit={submit} />
          </ActionPanel>
        )
      }
    >
      <Form.FilePicker id="files" title="Audio Files" allowMultipleSelection />
      <Form.Dropdown
        id="preset"
        title="Preset"
        value={preset}
        onChange={(value) => {
          if (!isPreset(value)) return;
          setPreset(value);
          setSpeed(String(getDefaultSpeed(value)));
        }}
      >
        {Object.entries(presets).map(([value, { title }]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      {rateEffect && (
        <Form.TextField
          id="speed"
          title="Speed Multiplier"
          placeholder="0.8"
          value={speed}
          onChange={setSpeed}
          info="Use 0.5 to 2. A value of 0.8 means 80% of the original speed."
        />
      )}
      {reverb && (
        <Form.TextField
          id="reverb"
          title="Reverb Amount"
          placeholder="50"
          defaultValue="50"
          info="Use a percentage from 0 to 100."
        />
      )}
      <Form.Dropdown id="format" title="Output Format" defaultValue={getDefaultFormat()}>
        {formats.map((format) => (
          <Form.Dropdown.Item key={format} value={format} title={format.toUpperCase()} />
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        id="outputDirectory"
        title="Output Folder"
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection={false}
        info="Leave empty to save each output beside its original file."
      />
      {progress && <Form.Description text={progress} />}
    </Form>
  );
}
