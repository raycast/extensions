import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { updateProperty } from "../../api"; // ← import your new helper
import { Property, PropertyFormat } from "../../models";

export interface UpdatePropertyFormValues {
  name: string;
  format?: string;
}

interface UpdatePropertyFormProps {
  spaceId: string;
  property: Property;
  mutateProperties: MutatePromise<Property[]>[];
}

export function UpdatePropertyForm({ spaceId, property, mutateProperties }: UpdatePropertyFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<UpdatePropertyFormValues>({
    initialValues: {
      name: property.name,
    },
    onSubmit: async (values) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Updating property..." });

        await updateProperty(spaceId, property.id, { name: values.name || "" });

        showToast(Toast.Style.Success, "Property updated successfully");
        mutateProperties.forEach((mutate) => mutate());
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to update property" });
      }
    },
    validation: {
      name: (v) => (!v ? "Name is required" : undefined),
    },
  });

  const propertyFormatKeys = Object.keys(PropertyFormat) as Array<keyof typeof PropertyFormat>;

  return (
    <Form
      navigationTitle="Edit Property"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        {...itemProps.format}
        title="Format"
        value={property.format}
        onChange={() => {}}
        onFocus={() => {}}
        info="Format is read-only"
      >
        <Form.Dropdown.Item
          value={property.format}
          title={propertyFormatKeys.find((key) => PropertyFormat[key] === property.format) || property.format}
          icon={{ source: `icons/property/${property.format}.svg` }}
        />
      </Form.Dropdown>
      <Form.TextField
        {...itemProps.name}
        title="Name"
        placeholder="Enter property name"
        autoFocus={true}
        info="The name of the property"
      />
    </Form>
  );
}
