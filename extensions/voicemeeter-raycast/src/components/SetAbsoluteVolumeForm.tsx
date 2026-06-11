import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { setTargetGain } from "../lib/controller";
import { notifyAction } from "../lib/feedback";
import { MAX_GAIN_DB, MIN_GAIN_DB, parseGain } from "../lib/target";
import type { CacheUpdate } from "../lib/target-cache";
import { VoicemeeterTarget } from "../lib/types";

interface FormValues {
  gain: string;
}

interface Props {
  target: VoicemeeterTarget;
  onSaved: (updates: CacheUpdate | CacheUpdate[]) => Promise<void> | void;
}

export function SetAbsoluteVolumeForm(props: Props) {
  const { pop } = useNavigation();

  async function onSubmit(values: FormValues) {
    const parsed = parseGain(values.gain);
    if (parsed === undefined) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Invalid value (${MIN_GAIN_DB} to ${MAX_GAIN_DB} dB).`,
      });
      return;
    }

    const result = await setTargetGain(props.target, parsed);
    await notifyAction(result);
    if (result.ok) {
      await props.onSaved({ targetId: props.target.id, gain: parsed });
      pop();
    }
  }

  return (
    <Form
      navigationTitle={`Set ${props.target.name} Volume`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Absolute Volume" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="gain"
        title="Target Gain (dB)"
        defaultValue={props.target.gain.toFixed(2)}
      />
    </Form>
  );
}
