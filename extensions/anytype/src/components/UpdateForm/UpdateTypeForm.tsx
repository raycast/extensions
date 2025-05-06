import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import { updateType } from "../../api";
import { useProperties } from "../../hooks";
import { IconFormat, ObjectLayout, PropertyLink, RawType, Type, TypeLayout, UpdateTypeRequest } from "../../models";
import { isEmoji } from "../../utils";

export interface UpdateTypeFormValues {
  name: string;
  plural_name: string;
  icon?: string;
  layout: string;
  properties?: string[];
}

interface UpdateTypeFormProps {
  spaceId: string;
  type: RawType;
  mutateTypes: MutatePromise<Type[]>[];
}

export function UpdateTypeForm({ spaceId, type, mutateTypes }: UpdateTypeFormProps) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);
  const { properties } = useProperties(spaceId);

  const initialValues: UpdateTypeFormValues = {
    name: type.name,
    plural_name: type.plural_name,
    icon: type.icon.format === IconFormat.Emoji ? type.icon.emoji : undefined,
    layout: type.layout,
    properties: type.properties?.map((p) => p.key) || [],
  };

  const { handleSubmit, itemProps } = useForm<UpdateTypeFormValues>({
    initialValues,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await showToast({ style: Toast.Style.Animated, title: "Updating type..." });

        const propertyLinks: PropertyLink[] =
          values.properties?.map((key) => {
            const prop = properties.find((p) => p.key === key)!;
            return { key: prop.key, format: prop.format, name: prop.name };
          }) || [];

        const request: UpdateTypeRequest = {
          name: values.name,
          plural_name: values.plural_name,
          icon: { format: IconFormat.Emoji, emoji: values.icon || "" },
          ...(availableLayouts.includes(values.layout as TypeLayout) ? { layout: values.layout as TypeLayout } : {}),
          properties: propertyLinks,
        };

        await updateType(spaceId, type.id, request);

        await showToast(Toast.Style.Success, "Type updated successfully");
        mutateTypes.forEach((mutate) => mutate());
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to update type" });
      } finally {
        setLoading(false);
      }
    },
    validation: {
      name: (v) => (!v ? "Name is required" : undefined),
      plural_name: (v) => (!v ? "Plural name is required" : undefined),
      icon: (v) => (v && !isEmoji(v) ? "Icon must be a single emoji" : undefined),
    },
  });

  const layoutKeys = Object.keys(TypeLayout) as Array<keyof typeof TypeLayout>;
  const availableLayouts = Object.values(TypeLayout);
  const isFixedLayout = !availableLayouts.includes(type.layout as unknown as TypeLayout);

  return (
    <Form
      navigationTitle="Edit Type"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Add name" />
      <Form.TextField {...itemProps.plural_name} title="Plural Name" placeholder="Add plural name" />
      <Form.TextField {...itemProps.icon} title="Icon" placeholder="Add emoji" />
      {isFixedLayout ? (
        <Form.Dropdown id={itemProps.layout.id} title="Layout" info="Layout of system types cannot be changed">
          <Form.Dropdown.Item
            key={initialValues.layout}
            value={initialValues.layout}
            title={
              (Object.keys(ObjectLayout) as Array<keyof typeof TypeLayout>).find(
                (k) => ObjectLayout[k] === initialValues.layout,
              )!
            }
          />
        </Form.Dropdown>
      ) : (
        <Form.Dropdown {...itemProps.layout} title="Layout">
          {layoutKeys.map((layout) => {
            const value = TypeLayout[layout];
            return <Form.Dropdown.Item key={layout} value={value} title={layout} icon={`icons/object/${layout}.svg`} />;
          })}
        </Form.Dropdown>
      )}
      <Form.TagPicker {...itemProps.properties} title="Properties" placeholder="Select properties">
        {properties.map((prop) => (
          <Form.TagPicker.Item key={prop.key} value={prop.key} title={prop.name} icon={prop.icon} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
