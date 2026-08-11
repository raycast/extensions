import { Action, ActionPanel, Color, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { EquationObj, useEquation } from "./libs/use-equation";
import OrganizeEquations from "./organize-equations";
import { IGNORE_COLORS } from "./core/constants";

export type EquationFormValues = Pick<Form.Values, "title" | "latex" | "tags">;

type AddMetadataProps = {
  latex: string;
  equation?: EquationObj;
};

export default function AddMetadata({ latex, equation }: AddMetadataProps) {
  const { createEquation, editEquation } = useEquation();
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<EquationFormValues>({
    onSubmit(values) {
      try {
        if (equation && equation.id) {
          editEquation(equation.id, { ...values, latex });
        } else {
          createEquation({ ...values, latex });
        }

        showToast({
          style: Toast.Style.Success,
          title: equation ? "Equation Edited" : "Equation Created",
        });

        push(<OrganizeEquations />);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: equation ? "Failed to Edit Equation" : "Failed to Create Equation",
          message: String(error),
        });
      }
    },

    validation: {
      title: FormValidation.Required,
      tags: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Enter a title" defaultValue={equation?.title} {...itemProps.title} />
      <Form.TagPicker title="Tag" defaultValue={equation?.tags} {...itemProps.tags}>
        {Object.keys(Color)
          .filter((key) => !IGNORE_COLORS.includes(key))
          .map((name) => {
            const value = Color[name as keyof typeof Color] as Color;
            return (
              <Form.TagPicker.Item
                key={name}
                value={value}
                title={name}
                icon={{ source: Icon.Circle, tintColor: value }}
              />
            );
          })}
      </Form.TagPicker>
      <Form.Separator />
      <Form.Description title="LaTeX" text={latex} />
    </Form>
  );
}
