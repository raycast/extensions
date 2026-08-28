import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useForm } from "@raycast/utils";

// Lib
import { computeClamp } from "./lib/generateClamp";
import { parseNumericInput, convertBetweenUnits } from "./lib/utils";

type FormValues = {
  unit: TUnit;
  minViewportWidth: string;
  maxViewportWidth: string;
  minFontSize: string;
  maxFontSize: string;
};

/** Inline per-field validation: every field must be a positive number. */
function positiveNumber(value?: string): string | undefined {
  const parsed = parseNumericInput(value ?? "");
  if (parsed === null) return "Enter a valid number";
  if (parsed <= 0) return "Must be greater than 0";
}

export default function Command() {
  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    initialValues: {
      unit: "px",
      minViewportWidth: "500",
      maxViewportWidth: "1200",
      minFontSize: "16",
      maxFontSize: "48",
    },
    validation: {
      minViewportWidth: positiveNumber,
      maxViewportWidth: positiveNumber,
      minFontSize: positiveNumber,
      maxFontSize: positiveNumber,
    },
    async onSubmit(formValues) {
      const result = computeClamp(formValues);
      if (!result.ok) {
        // Relational errors (e.g. max <= min) are not per-field, so they surface here.
        await showToast({ style: Toast.Style.Failure, title: "Invalid values", message: result.error });
        return;
      }
      await Clipboard.copy(result.value);
      await showToast({
        style: Toast.Style.Success,
        title: "Generated",
        message: "Copied font-size to clipboard",
      });
    },
  });

  // Switching units converts the existing values so the design stays the same.
  function handleUnitChange(next: string) {
    const nextUnit = next as TUnit;
    const prevUnit = values.unit;
    if (nextUnit === prevUnit) return;

    setValue("unit", nextUnit);
    setValue("minViewportWidth", convertBetweenUnits(values.minViewportWidth, prevUnit, nextUnit));
    setValue("maxViewportWidth", convertBetweenUnits(values.maxViewportWidth, prevUnit, nextUnit));
    setValue("minFontSize", convertBetweenUnits(values.minFontSize, prevUnit, nextUnit));
    setValue("maxFontSize", convertBetweenUnits(values.maxFontSize, prevUnit, nextUnit));
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Generate" />
        </ActionPanel>
      }
    >
      <Form.Description text="Create dynamic font sizes using the 'clamp' CSS function." />
      <Form.Dropdown id="unit" title="Measurement Unit" value={values.unit} onChange={handleUnitChange}>
        <Form.Dropdown.Item value="px" title="Pixels" />
        <Form.Dropdown.Item value="rem" title="REM" />
      </Form.Dropdown>
      <Form.TextField title="Minimum Viewport Width" placeholder="Enter minimum" {...itemProps.minViewportWidth} />
      <Form.TextField title="Maximum Viewport Width" placeholder="Enter maximum" {...itemProps.maxViewportWidth} />
      <Form.TextField title="Minimum Font Size" placeholder="Enter minimum" {...itemProps.minFontSize} />
      <Form.TextField title="Maximum Font Size" placeholder="Enter maximum" {...itemProps.maxFontSize} />
    </Form>
  );
}
