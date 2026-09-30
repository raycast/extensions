import { ActionPanel, Action, Form, Icon, Color, showToast, Toast, popToRoot } from "@raycast/api";
import { FC, useState, useRef, FormEvent } from "react";
import { useGetConfig } from "../hooks/useGetConfig";
import { useGetCategories } from "../hooks/useGetCategories";
import { updateConfigFile } from "../utils/updateConfigFile";

export const UpdateCategory: FC = () => {
  const { isLoading, paperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);

  const [category, setCategory] = useState<string>();

  const [newCategoryName, setNewCategoryName] = useState<string>();
  const [newCategoryNameError, setNewCategoryNameError] = useState<string | undefined>();

  const [color, setColor] = useState<string>();

  const colorsAsArray = useRef<Array<string>>(Object.keys(Color));

  const onBlurCategoryName = (event: unknown) => {
    if (((event as FormEvent<HTMLSelectElement>).target as HTMLSelectElement).value.length <= 0) {
      if (newCategoryNameError) return;

      setNewCategoryNameError("Enter new category name");
      return;
    }

    if (newCategoryNameError === undefined) return;
    setNewCategoryNameError(undefined);
  };

  const onSubmit = async (formValues: { category: string; newCategoryName: string; color: Color.ColorLike }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Update ${formValues.category} to -> ${formValues.newCategoryName}`,
    });

    try {
      if (
        formValues.newCategoryName.includes(" ") ||
        formValues.newCategoryName.includes("-") ||
        formValues.newCategoryName.includes("_")
      ) {
        throw new Error("Error value - Do not use spaces or dash and lower dash");
      }

      const categoriesLowerCase = categories.map((category) => category.toLowerCase());

      if (categoriesLowerCase.includes(formValues.newCategoryName.toLowerCase().trim())) {
        throw new Error(`The ${formValues.newCategoryName} category already exist`);
      }

      const newPaperRawData = { ...paperDataRaw };

      newPaperRawData[formValues.newCategoryName.toLowerCase()] = {
        papers: [...newPaperRawData[formValues.category.toLowerCase()].papers],
        color: formValues.color,
      };

      delete newPaperRawData[formValues.category.toLowerCase()];

      await updateConfigFile(newPaperRawData);

      toast.style = Toast.Style.Success;
      toast.title = "Category updated";
      popToRoot();
    } catch (error: Error | unknown) {
      toast.style = Toast.Style.Failure;

      if (error instanceof Error) {
        toast.title = error.message;
        return;
      }

      toast.title = "Oups... An error occured, please try again";
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Update Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Category" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="category"
        autoFocus={true}
        throttle={true}
        title="Select category to update"
        value={category}
        onChange={setCategory}
      >
        {categories.map((category, index) => {
          if (category === "Deleted") return null;
          return <Form.Dropdown.Item value={category} title={category} key={index} />;
        })}
      </Form.Dropdown>
      <Form.TextField
        id="newCategoryName"
        title="New category name"
        value={newCategoryName}
        onChange={setNewCategoryName}
        error={newCategoryNameError}
        onBlur={onBlurCategoryName}
      />
      <Form.Dropdown id="color" throttle={true} title="Color" value={color} onChange={setColor}>
        {colorsAsArray.current.map((color: string, i) => (
          <Form.Dropdown.Item
            // @ts-expect-error Raycast Type
            icon={{ source: Icon.Circle, tintColor: Color[color] }}
            key={i}
            title={color}
            value={color}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

UpdateCategory.displayName = "UpdateCategory";
