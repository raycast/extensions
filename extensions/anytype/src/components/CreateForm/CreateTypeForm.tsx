import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createType } from "../../api";
import { useProperties, useSpaces } from "../../hooks";
import { Color, CreateTypeRequest, IconFormat, IconName, PropertyLink, TypeLayout } from "../../models";
import { colorToHex, getCustomTypeIcon } from "../../utils";

export interface CreateTypeFormValues {
  spaceId?: string;
  name?: string;
  plural_name?: string;
  iconName?: string;
  iconColor?: string;
  layout?: TypeLayout;
  properties?: string[];
}

export interface CreateTypeFormProps {
  draftValues?: CreateTypeFormValues;
  enableDrafts: boolean;
}

export function CreateTypeForm({ draftValues, enableDrafts }: CreateTypeFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedSpaceId, setSelectedSpace] = useState<string>(draftValues?.spaceId || "");

  const { spaces, isLoadingSpaces, spacesError } = useSpaces();
  const { properties, isLoadingProperties, propertiesError } = useProperties(selectedSpaceId);

  useEffect(() => {
    if (spacesError || propertiesError) {
      showFailureToast(spacesError || propertiesError, { title: "Failed to load spaces or properties" });
    }
  }, [spacesError, propertiesError]);

  const { handleSubmit, itemProps } = useForm<CreateTypeFormValues>({
    initialValues: draftValues,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating type..." });

        const propertyLinks: PropertyLink[] =
          values.properties?.map((key) => {
            const prop = properties.find((p) => p.key === key);
            if (!prop) {
              throw new Error(`Property with key "${key}" not found`);
            }
            return { key: prop.key, format: prop.format, name: prop.name };
          }) || [];

        const request: CreateTypeRequest = {
          name: values.name || "",
          plural_name: values.plural_name || "",
          icon: {
            format: IconFormat.Icon,
            name: values.iconName || IconName.Document,
            color: values.iconColor || Color.Grey,
          },
          layout: values.layout || TypeLayout.Basic,
          properties: propertyLinks,
        };
        const response = await createType(selectedSpaceId, request);
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
    },
  });

  const layoutKeys = Object.keys(TypeLayout) as Array<keyof typeof TypeLayout>;
  const colorKeys = Object.keys(Color) as Array<keyof typeof Color>;
  const iconKeys = Object.keys(IconName) as Array<keyof typeof IconName>;

  return (
    <Form
      navigationTitle="Create Type"
      isLoading={loading || isLoadingSpaces || isLoadingProperties}
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Type" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        {...itemProps.spaceId}
        title="Space"
        onChange={setSelectedSpace}
        value={selectedSpaceId}
        placeholder="Search spaces..."
        info="Select the space where the type will be created"
      >
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={space.icon} />
        ))}
      </Form.Dropdown>
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
      <Form.Dropdown
        id={itemProps.layout.id}
        title="Layout"
        placeholder="Select layout"
        info="Select the layout for the type"
      >
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
