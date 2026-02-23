import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";

export interface SetBrightnessSubmitRequest {
  serial: string;
  name: string;
  adaptive: boolean;
  value: number;
}

interface SetBrightnessFormProps {
  displaySerial: string;
  displayName: string;
  displayAdaptive: boolean;
  initialBrightness: number;
  onSubmit: (request: SetBrightnessSubmitRequest) => Promise<boolean>;
}

interface SetBrightnessFormValues {
  brightness: string;
}

interface ParseBrightnessSuccess {
  ok: true;
  value: number;
}

interface ParseBrightnessFailure {
  ok: false;
  error: string;
}

export type ParseBrightnessResult = ParseBrightnessSuccess | ParseBrightnessFailure;

export function parseBrightness(input: string): ParseBrightnessResult {
  const value = input.trim();
  if (!/^\d+$/.test(value)) {
    return { ok: false, error: "Brightness must be an integer between 0 and 100." };
  }

  const parsed = Number.parseInt(value, 10);
  if (parsed > 100) {
    return { ok: false, error: "Brightness must be between 0 and 100." };
  }

  return { ok: true, value: parsed };
}

interface SubmitBrightnessInput {
  rawBrightness: string;
  requestBase: Omit<SetBrightnessSubmitRequest, "value">;
  onSubmit: (request: SetBrightnessSubmitRequest) => Promise<boolean>;
}

interface SubmitBrightnessResult {
  submitted: boolean;
  validationError?: string;
}

export async function submitBrightnessRequest({
  rawBrightness,
  requestBase,
  onSubmit,
}: SubmitBrightnessInput): Promise<SubmitBrightnessResult> {
  const parsed = parseBrightness(rawBrightness);
  if (!parsed.ok) {
    return { submitted: false, validationError: parsed.error };
  }

  try {
    const submitted = await onSubmit({
      ...requestBase,
      value: parsed.value,
    });

    return { submitted };
  } catch {
    return { submitted: false };
  }
}

export default function SetBrightnessForm({
  displaySerial,
  displayName,
  displayAdaptive,
  initialBrightness,
  onSubmit,
}: SetBrightnessFormProps) {
  const { pop } = useNavigation();
  const [brightness, setBrightness] = useState<string>(String(initialBrightness));
  const [brightnessError, setBrightnessError] = useState<string | undefined>();
  const submittingRef = useRef(false);

  async function handleSubmit(values: SetBrightnessFormValues) {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    try {
      const result = await submitBrightnessRequest({
        rawBrightness: values.brightness,
        requestBase: {
          serial: displaySerial,
          name: displayName,
          adaptive: displayAdaptive,
        },
        onSubmit,
      });

      if (result.validationError) {
        setBrightnessError(result.validationError);
        return;
      }

      setBrightnessError(undefined);
      if (result.submitted) {
        pop();
      }
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <Form
      navigationTitle={`Set Brightness - ${displayName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Brightness"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="brightness"
        title="Brightness (%)"
        value={brightness}
        onChange={(value) => {
          setBrightness(value);
          if (brightnessError) {
            setBrightnessError(undefined);
          }
        }}
        error={brightnessError}
        placeholder="0 - 100"
      />
      <Form.Description text="Enter an integer brightness value from 0 to 100." />
    </Form>
  );
}
