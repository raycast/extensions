import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { parseColor } from "../lib/color";
import { FONT_WEIGHTS, FontWeight } from "../lib/contrast";
import { resolveColors } from "../lib/extract";
import { pickAgain } from "../lib/launch";
import { sanitizeSize, sanitizeWeight } from "../lib/settings";
import { PickTarget } from "../lib/types";

export type FormValues = { foreground: string; background: string; sizePx?: number; weight?: FontWeight };

type Props = {
  foreground?: string;
  background?: string;
  sizePx?: number;
  weight?: FontWeight;
  onSubmit: (values: FormValues) => void;
  /** Go back to the result after submit (when the form was pushed from it). */
  popOnSubmit?: boolean;
};

const COLOR_INFO = "HEX (with or without #), rgb(), hsl(), oklch(), CSS names or Tailwind classes like text-slate-500.";

export default function ContrastForm(props: Props) {
  const { pop } = useNavigation();
  const [foreground, setForeground] = useState(props.foreground ?? "");
  const [background, setBackground] = useState(props.background ?? "");
  const [size, setSize] = useState(String(props.sizePx ?? ""));
  const [weight, setWeight] = useState(String(props.weight ?? ""));
  const [errors, setErrors] = useState<{ foreground?: string; background?: string }>({});

  function validate(value: string) {
    return parseColor(value) ? undefined : "Not a color. Try #767676 or rgb(118 118 118).";
  }

  function onForegroundChange(value: string) {
    // Pasting "#fff on #000" into the first field fills both fields.
    const both = resolveColors([value]);
    if (both.foreground && both.background && !background) {
      setForeground(both.foreground);
      setBackground(both.background);
    } else {
      setForeground(value);
    }
    if (errors.foreground) setErrors({ ...errors, foreground: undefined });
  }

  function submit() {
    const nextErrors = { foreground: validate(foreground), background: validate(background) };
    setErrors(nextErrors);
    if (nextErrors.foreground || nextErrors.background) return;
    props.onSubmit({
      foreground: foreground.trim(),
      background: background.trim(),
      sizePx: size ? sanitizeSize(size) : undefined,
      weight: weight ? sanitizeWeight(weight) : undefined,
    });
    if (props.popOnSubmit) pop();
  }

  const repick = (pick: PickTarget) => () =>
    pickAgain(pick, { foreground, background }).catch((error) => showFailureToast(error));

  return (
    <Form
      navigationTitle="Check Contrast"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Show Result" icon={Icon.Eye} onSubmit={submit} />
          <ActionPanel.Section title="Pick">
            <Action
              title="Pick Text Color"
              icon={Icon.EyeDropper}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={repick("foreground")}
            />
            <Action
              title="Pick Background Color"
              icon={Icon.EyeDropper}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={repick("background")}
            />
            <Action
              title="Pick Both Colors"
              icon={Icon.EyeDropper}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={repick("both")}
            />
          </ActionPanel.Section>
          <Action
            title="Swap Colors"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => {
              setForeground(background);
              setBackground(foreground);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Press ⌘F or ⌘B to pick a color from the screen." />
      <Form.TextField
        id="foreground"
        title="Text Color"
        placeholder="#767676"
        info={COLOR_INFO}
        value={foreground}
        error={errors.foreground}
        onChange={onForegroundChange}
        onBlur={(event) =>
          setErrors({ ...errors, foreground: event.target.value ? validate(event.target.value) : undefined })
        }
      />
      <Form.TextField
        id="background"
        title="Background"
        placeholder="#ffffff"
        info={COLOR_INFO}
        value={background}
        error={errors.background}
        onChange={(value) => {
          setBackground(value);
          if (errors.background) setErrors({ ...errors, background: undefined });
        }}
        onBlur={(event) =>
          setErrors({ ...errors, background: event.target.value ? validate(event.target.value) : undefined })
        }
      />
      <Form.Separator />
      <Form.TextField
        id="size"
        title="Font Size (px)"
        placeholder="16"
        value={size}
        onChange={setSize}
        info="Used for the WCAG large-text rule and the APCA minimum font size."
      />
      <Form.Dropdown id="weight" title="Font Weight" value={weight || "400"} onChange={setWeight}>
        {FONT_WEIGHTS.map((value) => (
          <Form.Dropdown.Item key={value} value={String(value)} title={String(value)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
