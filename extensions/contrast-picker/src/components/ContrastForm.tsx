import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { parseColor } from "../lib/color";
import { FONT_WEIGHTS, FontWeight } from "../lib/contrast";
import { resolveColors } from "../lib/extract";
import { pickAgain } from "../lib/launch";
import { DEFAULT_WEIGHT, sanitizeSize, sanitizeWeight } from "../lib/settings";
import { PickTarget } from "../lib/types";

export type FormValues = { foreground: string; background: string; sizePx?: number; weight?: FontWeight };

type FormFields = { foreground: string; background: string; size: string; weight: string };

type Props = {
  foreground?: string;
  background?: string;
  sizePx?: number;
  weight?: FontWeight;
  onSubmit: (values: FormValues) => void | Promise<void>;
  /** Go back to the result after submit (when the form was pushed from it). */
  popOnSubmit?: boolean;
  /** Set only when the form is pushed. A root view keeps the command title. */
  navigationTitle?: string;
};

const COLOR_INFO = "HEX (with or without #), rgb(), hsl(), oklch(), CSS names or Tailwind classes like text-slate-500.";
const COLOR_ERROR = "Not a color. Try #767676 or rgb(118 118 118).";

function validateColor(value: string | undefined) {
  if (!value?.trim()) return "Enter a color.";
  return parseColor(value) ? undefined : COLOR_ERROR;
}

export default function ContrastForm(props: Props) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values, setValue } = useForm<FormFields>({
    initialValues: {
      foreground: props.foreground ?? "",
      background: props.background ?? "",
      size: props.sizePx ? String(props.sizePx) : "",
      weight: String(props.weight ?? DEFAULT_WEIGHT),
    },
    validation: {
      foreground: validateColor,
      background: validateColor,
      size: (value) => {
        if (!value) return undefined;
        const size = Number(value);
        return Number.isFinite(size) && size >= 6 && size <= 200 ? undefined : "Use a size from 6 to 200.";
      },
    },
    onSubmit: async (fields) => {
      await props.onSubmit({
        foreground: fields.foreground.trim(),
        background: fields.background.trim(),
        sizePx: fields.size ? sanitizeSize(fields.size) : undefined,
        weight: fields.weight ? sanitizeWeight(fields.weight) : undefined,
      });
      if (props.popOnSubmit) pop();
    },
  });

  const repick = (pick: PickTarget) => () =>
    pickAgain(pick, { foreground: values.foreground, background: values.background }).catch((error) =>
      showFailureToast(error),
    );

  return (
    <Form
      navigationTitle={props.navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Show Result" icon={Icon.Eye} onSubmit={handleSubmit} />
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
              setValue("foreground", values.background);
              setValue("background", values.foreground);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Press ⌘F or ⌘B to pick a color from the screen." />
      <Form.TextField
        {...itemProps.foreground}
        title="Text Color"
        placeholder="#767676"
        info={COLOR_INFO}
        onChange={(value) => {
          // Pasting "#fff on #000" into the first field fills both fields.
          const both = resolveColors([value]);
          if (both.foreground && both.background && !values.background) {
            setValue("foreground", both.foreground);
            setValue("background", both.background);
          } else {
            itemProps.foreground.onChange?.(value);
          }
        }}
      />
      <Form.TextField {...itemProps.background} title="Background" placeholder="#ffffff" info={COLOR_INFO} />
      <Form.Separator />
      <Form.TextField
        {...itemProps.size}
        title="Font Size (px)"
        placeholder="16"
        info="Used for the WCAG large-text rule and the APCA minimum font size."
      />
      <Form.Dropdown {...itemProps.weight} title="Font Weight">
        {FONT_WEIGHTS.map((value) => (
          <Form.Dropdown.Item key={value} value={String(value)} title={String(value)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
