import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { reencode } from "../lib/capture";
import { formatSeconds } from "../lib/encode";
import { Capture } from "../lib/history";
import { CaptureUpdate, runEncode } from "./run-encode";

/** The usual choices plus whatever is saved, such as a Fit Under 10 MB result. */
function withCurrent(choices: number[], current: number): number[] {
  return choices.includes(current) ? choices : [...choices, current].sort((a, b) => (a || Infinity) - (b || Infinity));
}

function parseSeconds(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  const seconds = Number(trimmed.replace(",", "."));

  return Number.isFinite(seconds) && seconds >= 0 ? seconds : NaN;
}

/** Trim the start and end, and pick frame rate and width, in one re-encode. */
export function EditForm(props: { capture: Capture; onUpdate: CaptureUpdate }) {
  const { capture, onUpdate } = props;
  const { pop } = useNavigation();
  const [startError, setStartError] = useState<string>();
  const [endError, setEndError] = useState<string>();
  const total = capture.duration;

  const submit = async (values: { start: string; end: string; fps: string; maxWidth: string }) => {
    const start = parseSeconds(values.start) ?? 0;
    const end = parseSeconds(values.end);
    if (Number.isNaN(start) || start >= total) {
      setStartError(`Between 0 and ${total.toFixed(1)}`);

      return;
    }

    if (end !== undefined && (Number.isNaN(end) || end <= start || end > total + 0.05)) {
      setEndError(`Between ${start.toFixed(1)} and ${total.toFixed(1)}`);

      return;
    }

    const settings = {
      start,
      end: end === undefined || end >= total ? undefined : end,
      fps: Number(values.fps),
      maxWidth: Number(values.maxWidth),
    };
    pop();
    await runEncode("Re-encoding...", () => reencode(capture, settings), onUpdate);
  };

  return (
    <Form
      navigationTitle="Trim and Adjust"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Re-Encode GIF" icon={Icon.Wand} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Recording" text={`${formatSeconds(total)} long. Times are in seconds.`} />
      <Form.TextField
        id="start"
        title="Start At"
        placeholder="0"
        info="Cut this many seconds from the start."
        defaultValue={capture.settings.start ? String(capture.settings.start) : ""}
        error={startError}
        onChange={() => setStartError(undefined)}
      />
      <Form.TextField
        id="end"
        title="End At"
        placeholder={total.toFixed(1)}
        info="Leave empty to keep everything up to the end. Tip: trim the last half second to drop the stop click."
        defaultValue={capture.settings.end !== undefined ? String(capture.settings.end) : ""}
        error={endError}
        onChange={() => setEndError(undefined)}
      />
      <Form.Separator />
      <Form.Dropdown id="fps" title="Frame Rate" defaultValue={String(capture.settings.fps)}>
        {withCurrent([6, 10, 15, 20, 30], capture.settings.fps).map((fps) => (
          <Form.Dropdown.Item key={fps} value={String(fps)} title={`${fps} fps`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="maxWidth" title="Max Width" defaultValue={String(capture.settings.maxWidth)}>
        {withCurrent([480, 640, 800, 1000, 1280, 1600, 0], capture.settings.maxWidth).map((width) => (
          <Form.Dropdown.Item key={width} value={String(width)} title={width === 0 ? "Original" : `${width} px`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
