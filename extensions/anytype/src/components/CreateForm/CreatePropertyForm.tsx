import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import { createProperty } from "../../api";
import { Color, PropertyFormat } from "../../models";
import { colorToHex } from "../../utils";

export interface CreatePropertyFormValues {
  name: string;
  format?: string;
}

interface TagInfo {
  name: string;
  color: Color;
}

interface CreatePropertyFormProps {
  spaceId: string;
  draftValues: CreatePropertyFormValues;
}

export function CreatePropertyForm({ spaceId, draftValues }: CreatePropertyFormProps) {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [tagInput, setTagInput] = useState("");

  const getRandomColor = () => {
    return Object.values(Color)[Math.floor(Math.random() * Object.values(Color).length)];
  };

  const { handleSubmit, itemProps, values } = useForm<CreatePropertyFormValues>({
    initialValues: { ...draftValues, format: draftValues.format as PropertyFormat },
    onSubmit: async (values) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating property..." });

        // Add any remaining tag input
        const finalTags =
          tagInput.trim() && !tags.find((tag) => tag.name === tagInput.trim())
            ? [...tags, { name: tagInput.trim(), color: getRandomColor() }]
            : tags;

        await createProperty(spaceId, {
          name: values.name,
          format: values.format as PropertyFormat,
          tags: finalTags.length > 0 ? finalTags : undefined,
        });

        showToast(Toast.Style.Success, "Property created successfully");
        popToRoot();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to create property" });
      }
    },
    validation: {
      name: (v) => (!v ? "Name is required" : undefined),
    },
  });

  const propertyFormatKeys = Object.keys(PropertyFormat) as Array<keyof typeof PropertyFormat>;
  const isSelectFormat = values?.format === PropertyFormat.Select || values?.format === PropertyFormat.MultiSelect;

  const addTag = (tagName: string) => {
    const trimmedName = tagName.trim();
    if (trimmedName && !tags.find((tag) => tag.name === trimmedName)) {
      const newTags = [...tags, { name: trimmedName, color: getRandomColor() }];
      setTags(newTags);
      setTagInput("");
    }
  };

  const handleTagInputChange = (text: string) => {
    setTagInput(text);
    if (text.endsWith(",")) {
      addTag(text.slice(0, -1));
    }
  };

  return (
    <Form
      navigationTitle="Create Property"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Property" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Add name" info="The name of the property" />
      <Form.Dropdown {...itemProps.format} title="Format" info="The format of the property">
        {propertyFormatKeys.map((key) => {
          const value = PropertyFormat[key];
          return (
            <Form.Dropdown.Item key={key} value={value} title={key} icon={{ source: `icons/property/${value}.svg` }} />
          );
        })}
      </Form.Dropdown>
      {isSelectFormat && (
        <>
          <Form.TextField
            id="tag-input"
            title="Add Tags"
            placeholder="Type tag name and press comma"
            value={tagInput}
            onChange={handleTagInputChange}
            info="Tags will be created with random colors"
            onBlur={() => addTag(tagInput)}
          />
          {tags.length > 0 && (
            <Form.TagPicker
              id="created-tags"
              title="Tags to Create"
              value={tags.map((t) => t.name)}
              onChange={(selectedTagNames) => {
                setTags(tags.filter((tag) => selectedTagNames.includes(tag.name)));
              }}
            >
              {tags.map((tag) => (
                <Form.TagPicker.Item
                  key={tag.name}
                  value={tag.name}
                  title={tag.name}
                  icon={{ source: Icon.Tag, tintColor: colorToHex[tag.color] }}
                />
              ))}
            </Form.TagPicker>
          )}
        </>
      )}
    </Form>
  );
}
