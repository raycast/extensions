import { Form, Icon, Color, ActionPanel, Action, Toast, showToast, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { FC, useRef } from "react";
import { useGetConfig } from "../hooks/useGetConfig";
import { useGetCategories } from "../hooks/useGetCategories";
import { updateConfigFile } from "../utils/updateConfigFile";

type onSubmitValues = {
  category: string;
  color: string;
};

export const CreateCategory: FC = () => {
  const { isLoading, paperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);
  const colorsAsArray = useRef<Array<string>>(Object.keys(Color));
  const { handleSubmit, itemProps } = useForm<onSubmitValues>({
    async onSubmit(values) {
      try {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Create New Category",
        });

        const newPaperRawData = { ...paperDataRaw };
        newPaperRawData[values.category.toLowerCase()] = {
          color: values.color,
          papers: [],
        };

        await updateConfigFile(newPaperRawData);

        toast.style = Toast.Style.Success;
        toast.title = `${values.category} created`;

        popToRoot();
      } catch (error) {
        return false;
      }
    },
    validation: {
      category: (value) => {
        if (!value) return "Category name is required";
        if (value.includes(" ") || value.includes("-") || value.includes("_"))
          return "Error value - Do not use spaces or dash and lower dash";

        const categoriesLowerCase = categories.map((category) => category.toLowerCase());
        if (categoriesLowerCase.includes(value.toLowerCase().trim())) return `The ${value} category already exist`;
      },
      color: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create New Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create New Category" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        info="Do not use spaces or dash and lower dash."
        placeholder="Enter new category name"
        title="New Category"
        {...itemProps.category}
      />
      <Form.Dropdown title="Color" {...itemProps.color}>
        {colorsAsArray.current.map((color, i) => (
          <Form.Dropdown.Item
            // @ts-expect-error Raycast Type
            icon={{ source: Icon.Circle, tintColor: Color[color] }}
            key={i}
            title={String(color)}
            value={String(color)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

CreateCategory.displayName = "CreateCategory";
