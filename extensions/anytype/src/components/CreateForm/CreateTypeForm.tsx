import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import { createType } from "../../api";
import { useProperties, useSpaces } from "../../hooks";
import { CreateTypeRequest, IconFormat, PropertyLink, TypeLayout } from "../../models";
import { isEmoji } from "../../utils";

export interface CreateTypeFormValues {
  space: string;
  name: string;
  plural_name?: string;
  icon?: string;
  layout?: TypeLayout;
  properties?: string[];
}

export interface CreateTypeFormProps {
  draftValues: CreateTypeFormValues;
}

export function CreateTypeForm({ draftValues }: CreateTypeFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<string>(draftValues.space);

  const { spaces } = useSpaces();
  const { properties } = useProperties(selectedSpace);

  const { handleSubmit, itemProps } = useForm<CreateTypeFormValues>({
    initialValues: draftValues,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating type..." });

        const propertyLinks: PropertyLink[] =
          values.properties?.map((key) => {
            const prop = properties.find((p) => p.key === key)!;
            return { key: prop.key, format: prop.format, name: prop.name };
          }) || [];

        const request: CreateTypeRequest = {
          name: values.name || "",
          plural_name: values.plural_name || "",
          icon: { format: IconFormat.Emoji, emoji: values.icon || "" },
          Layout: values.layout || TypeLayout.Basic,
          Properties: propertyLinks,
        };
        const response = await createType(selectedSpace, request);
        if (response.type?.key) {
          await showToast(Toast.Style.Success, "Type created successfully");
          popToRoot();
        } else {
          await showToast(Toast.Style.Failure, "Failed to create type");
        }
      } catch (error) {
        await showFailureToast(error, { title: "Failed to create type" });
      } finally {
        setLoading(false);
      }
    },
    validation: {
      name: (v) => (!v ? "Name is required" : undefined),
      plural_name: (v) => (!v ? "Plural name is required" : undefined),
      icon: (v) => (typeof v === "string" && v && !isEmoji(v) ? "Icon must be a single emoji" : undefined),
    },
  });

  const layoutKeys = Object.keys(TypeLayout) as Array<keyof typeof TypeLayout>;

  return (
    <Form
      navigationTitle="Create Type"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Type" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.space} title="Space" onChange={setSelectedSpace} value={selectedSpace}>
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={space.icon} />
        ))}
      </Form.Dropdown>
      <Form.TextField {...itemProps.name} title="Name" placeholder="Add name" />
      <Form.TextField {...itemProps.plural_name} title="Plural Name" placeholder="Add plural name" />
      <Form.TextField {...itemProps.icon} title="Icon" placeholder="Add emoji" />
      <Form.Dropdown id={itemProps.layout.id} title="Layout">
        {layoutKeys.map((layout) => {
          const value = TypeLayout[layout];
          return <Form.Dropdown.Item key={layout} value={value} title={layout} icon={`icons/object/${layout}.svg`} />;
        })}
      </Form.Dropdown>
      <Form.TagPicker {...itemProps.properties} title="Properties" placeholder="Select properties">
        {properties.map((prop) => (
          <Form.TagPicker.Item key={prop.key} value={prop.key} title={prop.name} icon={prop.icon} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
