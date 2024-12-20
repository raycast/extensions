import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { getContrastRatio, isColor } from "../utils";
import { ResultView } from "./ResultView";

interface CheckContrastFormValues {
  textColor: string;
  bgColor: string;
}

export function InputForm() {
  const { push } = useNavigation();

  const validateInput = (value: string | undefined): string | undefined => {
    if (!value) {
      return `Color is required.`;
    }
    if (!isColor(value)) {
      return "Invalid color format.";
    }
    return undefined;
  };

  const { handleSubmit, itemProps } = useForm<CheckContrastFormValues>({
    onSubmit(values) {
      const contrastRatio = +getContrastRatio(values.textColor, values.bgColor);
      push(<ResultView calculatedRatio={contrastRatio} />);
    },
    validation: {
      textColor: (value: string | undefined) => validateInput(value),
      bgColor: (value: string | undefined) => validateInput(value),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Contrast Ratio" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Text Color" placeholder="HEX, RGB or HSL format" {...itemProps.textColor} />
      <Form.TextField title="Background Color" placeholder="HEX, RGB or HSL format" {...itemProps.bgColor} />
    </Form>
  );
}
