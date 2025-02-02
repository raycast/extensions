import { Action, ActionPanel, Form, Icon, Image, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { createObject } from "../api/createObject";
import { Space, Type } from "../helpers/schemas";
import { CreateObjectFormValues } from "../create-object";

interface CreateObjectFormProps {
  spaces: Space[];
  objectTypes: Type[];
  selectedSpace: string;
  setSelectedSpace: (spaceId: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  isLoading: boolean;
  draftValues: CreateObjectFormValues;
}

export default function CreateObjectForm({
  spaces,
  objectTypes,
  selectedSpace,
  setSelectedSpace,
  selectedType,
  setSelectedType,
  isLoading,
  draftValues,
}: CreateObjectFormProps) {
  const [loading, setLoading] = useState(false);
  const hasSelectedSpaceAndType = selectedSpace && selectedType;

  const { handleSubmit, itemProps } = useForm<CreateObjectFormValues>({
    initialValues: draftValues,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating object..." });

        await createObject(selectedSpace, {
          icon: values.icon || "",
          name: values.name || "",
          description: values.description || "",
          body: values.body || "",
          source: values.source || "",
          template_id: "",
          object_type_unique_key: selectedType,
        });

        await showToast(Toast.Style.Success, "Object created successfully");
        popToRoot();
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to create object", String(error));
      } finally {
        setLoading(false);
      }
    },
    validation: {
      name: (value) => {
        if (!["ot-bookmark", "ot-note"].includes(selectedType) && !value) {
          return "Name is required";
        }
      },
      icon: (value) => {
        if (value && value.length > 2) {
          return "Icon must be a single character";
        }
      },
      source: (value) => {
        if (selectedType === "ot-bookmark" && !value) {
          return "Source is required for Bookmarks";
        }
      },
    },
  });

  function getQuicklink(): { name: string; link: string } {
    const url = "raycast://extensions/any/anytype/create-object";

    const launchContext = {
      defaults: {
        space: selectedSpace,
        type: selectedType,
        name: itemProps.name.value,
        icon: itemProps.icon.value,
        description: itemProps.description.value,
        body: itemProps.body.value,
        source: itemProps.source.value,
      },
    };

    return {
      name: `Create ${objectTypes.find((type) => type.unique_key === selectedType)?.name} in ${spaces.find((space) => space.id === selectedSpace)?.name}`,
      link: url + "?launchContext=" + encodeURIComponent(JSON.stringify(launchContext)),
    };
  }

  return (
    <Form
      isLoading={loading || isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Object" icon={Icon.Plus} onSubmit={handleSubmit} />
          {hasSelectedSpaceAndType && (
            <Action.CreateQuicklink
              title={`Create Quicklink: ${objectTypes.find((type) => type.unique_key === selectedType)?.name}`}
              quicklink={getQuicklink()}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="space"
        title="Space"
        value={selectedSpace}
        onChange={setSelectedSpace}
        storeValue={true}
        info="Select the space where the object will be created"
      >
        {spaces?.map((space) => (
          <Form.Dropdown.Item
            key={space.id}
            value={space.id}
            title={space.name}
            icon={{ source: space.icon, mask: Image.Mask.RoundedRectangle }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="type"
        title="Type"
        value={selectedType}
        onChange={setSelectedType}
        storeValue={true} // TODO: does not work
        info="Select the type of object to create"
      >
        {objectTypes.map((type) => (
          <Form.Dropdown.Item key={type.unique_key} value={type.unique_key} title={type.name} icon={type.icon} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {hasSelectedSpaceAndType && (
        <>
          {selectedType === "ot-bookmark" ? (
            <Form.TextField
              {...itemProps.source}
              title="Source"
              placeholder="Add link"
              info="Provide the source URL for the bookmark"
            />
          ) : (
            <>
              {!["ot-note"].includes(selectedType) && (
                <Form.TextField
                  {...itemProps.name}
                  title="Name"
                  placeholder="Add a name"
                  info="Enter the name of the object"
                />
              )}
              {!["ot-task", "ot-note", "ot-profile"].includes(selectedType) && (
                <Form.TextField
                  {...itemProps.icon}
                  title="Icon"
                  placeholder="Add an emoji"
                  info="Enter a single emoji character to represent the object"
                />
              )}
              <Form.TextField
                {...itemProps.description}
                title="Description"
                placeholder="Add a description"
                info="Provide a brief description of the object"
              />
              {!["ot-set", "ot-collection"].includes(selectedType) && (
                <Form.TextArea
                  {...itemProps.body}
                  title="Body"
                  placeholder="Add text in markdown"
                  info="Parses markdown to Anytype Blocks.

It supports:
- Headings, subheadings, and paragraphs
- Number, bullet, and checkbox lists
- Code blocks, blockquotes, and tables
- Text formatting: bold, italics, strikethrough, inline code, hyperlinks"
                />
              )}
            </>
          )}
        </>
      )}
    </Form>
  );
}
