import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { updateTag } from "../../api";
import { Color, Tag } from "../../models";
import { colorToHex, hexToColor } from "../../utils";

export interface UpdateTagFormValues {
  name: string;
  color: string;
}

interface UpdateTagFormProps {
  spaceId: string;
  propertyId: string;
  tag: Tag;
  mutateTags: () => void;
}

export function UpdateTagForm({ spaceId, propertyId, tag, mutateTags }: UpdateTagFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<UpdateTagFormValues>({
    initialValues: {
      name: tag.name,
      color: hexToColor[tag.color] as Color,
    },
    onSubmit: async (values) => {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Updating tag…",
        });

        await updateTag(spaceId, propertyId, tag.id, {
          name: values.name,
          color: values.color as Color,
        });

        await showToast(Toast.Style.Success, "Tag updated successfully");
        mutateTags();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to update tag" });
      }
    },
    validation: {
      name: (v) => (!v ? "Name is required" : undefined),
      color: (v) => (!v ? "Color is required" : undefined),
    },
  });

  const tagColorKeys = Object.keys(Color) as Array<keyof typeof Color>;

  return (
    <Form
      navigationTitle="Edit Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Add name" info="The name of the tag" />
      <Form.Dropdown {...itemProps.color} title="Color" placeholder="Select color" info="The color of the tag">
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
