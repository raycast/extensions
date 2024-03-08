import { Form, Icon, Color, ActionPanel, Action, Toast, showToast, useNavigation } from "@raycast/api";
import { FC, FormEvent, useRef, useState } from "react";
import { useGetConfig } from "../hooks/useGetConfig";
import { useGetCategories } from "../hooks/useGetCategories";
import { updateConfigFile } from "../utils/updateConfigFile";
import { ListMode } from "./ListMode";

type onSubmitValues = {
  category: string;
  color: Color.ColorLike;
};

export const CreateCategory: FC = () => {
  const { isLoading, paperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);
  const [category, setCategory] = useState<string>();
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const { push } = useNavigation();

  const [color, setColor] = useState<string>();

  const colorsAsArray = useRef<Array<string>>(Object.keys(Color));

  const onBlurCategory = (event: unknown) => {
    if (((event as FormEvent<HTMLInputElement>).target as HTMLInputElement).value.length <= 0) {
      if (categoryError) return;

      setCategoryError("Enter category");
      return;
    }

    if (categoryError === undefined) return;
    setCategoryError(undefined);
  };

  const onSubmit = async (newCategoryValues: onSubmitValues) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Create New Category",
    });

    try {
      if (categories.length === 0) throw new Error("Oups... An error occured, please try again");

      if (
        newCategoryValues.category.includes(" ") ||
        newCategoryValues.category.includes("-") ||
        newCategoryValues.category.includes("_")
      ) {
        toast.style = Toast.Style.Failure;
        toast.title = `Error value - Do not use spaces or dash and lower dash`;
        return;
      }

      const categoriesLowerCase = categories.map((category) => category.toLowerCase());

      if (categoriesLowerCase.includes(newCategoryValues.category.toLowerCase().trim())) {
        toast.style = Toast.Style.Failure;
        toast.title = `The ${newCategoryValues.category} category already exist`;
        return;
      }

      const newPaperRawData = { ...paperDataRaw };
      newPaperRawData[newCategoryValues.category.toLowerCase()] = {
        color: newCategoryValues.color,
        papers: [],
      };

      await updateConfigFile(newPaperRawData);

      toast.style = Toast.Style.Success;
      toast.title = `${newCategoryValues.category} created`;

      push(<ListMode />);
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
      navigationTitle="Create New Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create New Category" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        info="Do not use spaces or dash and lower dash."
        id="category"
        title="New Category"
        value={category}
        onChange={setCategory}
        autoFocus={true}
        error={categoryError}
        onBlur={onBlurCategory}
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

CreateCategory.displayName = "CreateCategory";
