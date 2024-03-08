import { ActionPanel, Form, Action, Toast, showToast, useNavigation } from "@raycast/api";
import { FC, FormEvent, useState } from "react";
import { Paper, Base64 } from "../types";
import { useGetConfig } from "../hooks/useGetConfig";
import { useGetCategories } from "../hooks/useGetCategories";
import { encode } from "../utils/base64";
import { updateConfigFile } from "../utils/updateConfigFile";
import { ListMode } from "./ListMode";

export const CreatePaper: FC = () => {
  const { isLoading, paperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);
  const { push } = useNavigation();

  const [name, setName] = useState<string>();
  const [nameError, setNameError] = useState<string | undefined>();

  const [createdAt, setCreatedAt] = useState<Date | null>(new Date());
  const [createdAtError, setCreatedAtError] = useState<string | undefined>();

  const [content, setContent] = useState<string>();

  const [category, setCategory] = useState<string>();

  const [description, setDescription] = useState<string>();

  const onBlurName = (event: unknown) => {
    if (((event as FormEvent<HTMLInputElement>).target as HTMLInputElement).value.length <= 0) {
      if (nameError) return;

      setNameError("Enter name");
      return;
    }

    if (nameError === undefined) return;
    setNameError(undefined);
  };

  const onBlurCreatedAt = (event: unknown) => {
    if (((event as FormEvent<HTMLSelectElement>).target as HTMLSelectElement).value === null) {
      if (createdAtError) return;

      setCreatedAtError("Enter date");
      return;
    }

    if (createdAtError === undefined) return;
    setCreatedAtError(undefined);
  };

  const onSubmit = async (formValues: Paper & { category: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding new paper",
    });

    try {
      const newPaperRawData = { ...paperDataRaw };
      const newPaper = {
        name: formValues.name,
        description: formValues.description || "",
        content: encode(formValues.content) as Base64,
        createdAt: new Date(formValues.createdAt).getTime(),
      };

      newPaperRawData[formValues.category.toLowerCase()].papers.push({ ...newPaper });

      await updateConfigFile(newPaperRawData);

      toast.style = Toast.Style.Success;
      toast.title = "Paper Created";

      push(<ListMode />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Oups.. An error occured, please try again";
    }
  };

  return (
    <Form
      navigationTitle="Create paper"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Paper" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        value={name}
        onChange={setName}
        title="Name of your paper"
        error={nameError}
        onBlur={onBlurName}
        placeholder="Enter the name of your new paper"
      />
      <Form.DatePicker
        id="createdAt"
        value={createdAt}
        onChange={setCreatedAt}
        title="Created at"
        // @ts-expect-error Raycast Type
        type={Form.DatePicker.Date}
        error={createdAtError}
        onBlur={onBlurCreatedAt}
      />
      <Form.TextArea
        id="content"
        value={content}
        title="Content"
        onChange={setContent}
        enableMarkdown={true}
        placeholder="Write anything you want, you can use Markdown syntax"
      />
      <Form.Dropdown id="category" title="Category" value={category} onChange={setCategory} throttle={true}>
        {categories.map((category, index) => {
          if (category === "Deleted") return null;
          return <Form.Dropdown.Item title={category} value={category.toLowerCase()} key={index} />;
        })}
      </Form.Dropdown>
      <Form.TextField
        id="description"
        placeholder="Enter a description"
        info="Optional field"
        value={description}
        onChange={setDescription}
        title="Description"
      />
    </Form>
  );
};

CreatePaper.displayName = "CreatePaper";
