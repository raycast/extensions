import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useCreateCustomRatio } from "../hooks/useCustomRatios";
import { RatioType } from ".";

interface CustomRatioFormValues {
  widthField: string;
  heightField: string;
}

export default function CreateCustomRatio(props: { totalCustomRatios: number; onCreate: (ar: RatioType) => void }) {
  const { totalCustomRatios, onCreate } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CustomRatioFormValues>({
    onSubmit: (values) => {
      useCreateCustomRatio(Number(values.widthField), Number(values.heightField));
      onCreate({
        key: `${totalCustomRatios + 1}`,
        width: Number(values.widthField),
        height: Number(values.heightField),
      });
      pop();
    },
    validation: {
      widthField: (value) => {
        if (!value || isNaN(Number(value))) {
          return "The field should be a number!";
        }
      },
      heightField: (value) => {
        if (!value || isNaN(Number(value))) {
          return "The field should be a number!";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Create Custom Ratio"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField placeholder="16" {...itemProps.widthField} />
      <Form.TextField placeholder="9" {...itemProps.heightField} />
    </Form>
  );
}
