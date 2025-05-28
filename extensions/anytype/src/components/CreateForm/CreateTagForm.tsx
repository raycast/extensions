import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { createTag } from "../../api";
import { Color } from "../../models";
import { colorToHex } from "../../utils";

export interface CreateTagFormValues {
  name: string;
  color?: string;
}

interface CreateTagFormProps {
  spaceId: string;
  propertyId: string;
  draftValues: CreateTagFormValues;
}

export function CreateTagForm({ spaceId, propertyId, draftValues }: CreateTagFormProps) {
  const { handleSubmit, itemProps } = useForm<CreateTagFormValues>({
    initialValues: { ...draftValues, name: draftValues.name, color: draftValues.color as Color },
    onSubmit: async (values) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating tag..." });

        await createTag(spaceId, propertyId, {
          name: values.name || "",
          color: values.color as Color,
        });

        showToast(Toast.Style.Success, "Tag created successfully");
        popToRoot();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to create tag" });
      }
    },
    validation: {
      name: (value) => {
        if (!value) {
          return "Name is required";
        }
      },
      color: (value) => {
        if (!value) {
          return "Color is required";
        }
      },
    },
  });

  const tagColorKeys = Object.keys(Color) as Array<keyof typeof Color>;

  return (
    <Form
      navigationTitle="Create Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tag" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Enter tag name" info="The name of the tag" />
      <Form.Dropdown {...itemProps.color} title="Color" info="The color of the tag">
        {tagColorKeys.map((key) => {
          const value = Color[key];
          return (
            <Form.Dropdown.Item
              key={key}
              value={value}
              title={key}
              icon={{ source: Icon.Dot, tintColor: colorToHex[value] }}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}
