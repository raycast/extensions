import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import { updateType } from "../../api";
import { useProperties } from "../../hooks";
import {
  Color,
  IconFormat,
  IconName,
  ObjectLayout,
  PropertyLink,
  RawType,
  Type,
  TypeLayout,
  UpdateTypeRequest,
} from "../../models";
import { colorToHex, getCustomTypeIcon } from "../../utils";

export interface UpdateTypeFormValues {
  key: string;
  name: string;
  plural_name: string;
  iconName?: string;
  iconColor?: string;
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
    iconName: type.icon.format === IconFormat.Icon ? type.icon.name : IconName.Document,
    iconColor: type.icon.format === IconFormat.Icon ? type.icon.color : Color.Grey,
    layout: type.layout,
    properties: type.properties?.map((p) => p.key) || [],
    key: type.key,
  };

  const { handleSubmit, itemProps } = useForm<UpdateTypeFormValues>({
    initialValues,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await showToast({ style: Toast.Style.Animated, title: "Updating type..." });

        const propertyLinks: PropertyLink[] =
          values.properties?.map((key) => {
            const prop = properties.find((p) => p.key === key);
            if (!prop) {
              throw new Error(`Property with key "${key}" not found`);
            }
            return { key: prop.key, format: prop.format, name: prop.name };
          }) || [];

        const request: UpdateTypeRequest = {
          key: values.key,
          name: values.name,
          plural_name: values.plural_name,
          icon: {
            format: IconFormat.Icon,
            name: values.iconName || IconName.Document,
            color: values.iconColor || Color.Grey,
          },
          ...(availableLayouts.includes(values.layout as TypeLayout) ? { layout: values.layout as TypeLayout } : {}),
          properties: propertyLinks,
        };

        await updateType(spaceId, type.id, request);

        await showToast(Toast.Style.Success, "Type updated successfully");
        await Promise.all(mutateTypes.map((mutate) => mutate()));
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
    },
  });

  const layoutKeys = Object.keys(TypeLayout) as Array<keyof typeof TypeLayout>;
  const colorKeys = Object.keys(Color) as Array<keyof typeof Color>;
  const iconKeys = Object.keys(IconName) as Array<keyof typeof IconName>;
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
      <Form.TextField {...itemProps.name} title="Name" placeholder="Add name" info="The name of the type" />
      <Form.TextField
        {...itemProps.plural_name}
        title="Plural Name"
        placeholder="Add plural name"
        info="The plural name of the type"
      />
      <Form.Dropdown
        {...itemProps.iconName}
        title="Icon"
        placeholder="Select an icon"
        info="Choose an icon for the type"
      >
        {iconKeys.map((name) => (
          <Form.Dropdown.Item
            key={name}
            value={IconName[name]}
            title={name}
            icon={getCustomTypeIcon(IconName[name], itemProps.iconColor?.value || Color.Grey)}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        {...itemProps.iconColor}
        title="Icon Color"
        placeholder="Select a color"
        info="Choose a color for the icon"
      >
        {colorKeys.map((color) => (
          <Form.Dropdown.Item
            key={color}
            value={Color[color]}
            title={color}
            icon={{ source: Icon.Dot, tintColor: { light: colorToHex[Color[color]], dark: colorToHex[Color[color]] } }}
          />
        ))}
      </Form.Dropdown>
      {isFixedLayout ? (
        <Form.Dropdown id={itemProps.layout.id} title="Layout" info="Layout of system types cannot be changed">
          <Form.Dropdown.Item
            key={initialValues.layout}
            value={initialValues.layout}
            title={(() => {
              const layoutKey = (Object.keys(ObjectLayout) as Array<keyof typeof TypeLayout>).find(
                (k) => ObjectLayout[k] === initialValues.layout,
              );
              return layoutKey ? layoutKey : "Unknown Layout";
            })()}
          />
        </Form.Dropdown>
      ) : (
        <Form.Dropdown
          {...itemProps.layout}
          title="Layout"
          placeholder="Select layout"
          info="Select the layout for the type"
        >
          {layoutKeys.map((layout) => {
            const value = TypeLayout[layout];
            return <Form.Dropdown.Item key={layout} value={value} title={layout} icon={`icons/object/${layout}.svg`} />;
          })}
        </Form.Dropdown>
      )}
      <Form.TagPicker {...itemProps.properties} title="Properties" placeholder="Select properties">
        {properties.map((prop) => (
          <Form.TagPicker.Item key={prop.id} value={prop.key} title={prop.name} icon={prop.icon} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        {...itemProps.key}
        title="Key"
        placeholder="Add key"
        info="The key for the type must be unique and in snake_case format"
      />
    </Form>
  );
}
