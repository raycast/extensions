import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FC, FormEvent, useEffect, useState } from "react";
import { Base64, Paper } from "../types";
import { decode } from "../utils/base64";
import { useGetConfig } from "../hooks/useGetConfig";
import { useGetCategories } from "../hooks/useGetCategories";
import { encode } from "../utils/base64";
import { updateConfigFile } from "../utils/updateConfigFile";
import { ListMode } from "./ListMode";

type EditModeProps = {
  paper: Paper;
  paperCategory: string;
  index: number;
};

export const EditMode: FC<EditModeProps> = ({ paper, paperCategory, index }) => {
  const { isLoading, paperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);
  const { push } = useNavigation();

  const [name, setName] = useState<string>(paper.name || "");
  const [nameError, setNameError] = useState<string | undefined>();

  const [createdAt, setCreatedAt] = useState<Date | null>(new Date(paper.createdAt) || "");
  const [createdAtError, setCreatedAtError] = useState<string | undefined>();

  const [content, setContent] = useState<string>(paper.content || "");

  const [category, setCategory] = useState<string>(paperCategory || "");

  const [description, setDescription] = useState<string>(paper.description || "");

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

  useEffect(() => {
    setContent(decode(paper.content));
  }, []);

  const onSubmit = async (formValues: Paper & { category: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Editing ${formValues.name} paper`,
    });

    try {
      const objFormated: Paper = {
        name: formValues.name,
        description: formValues.description || "",
        content: encode(formValues.content) as Base64,
        createdAt: new Date(formValues.createdAt).getTime(),
      };
      const newPaperRawData = { ...paperDataRaw };

      if (formValues.category !== paperCategory) {
        newPaperRawData[paperCategory].papers.splice(index, 1);
        newPaperRawData[formValues.category].papers.push(objFormated);

        await updateConfigFile(newPaperRawData);

        toast.style = Toast.Style.Success;
        toast.title = "Success";

        push(<ListMode />);
        return;
      }

      newPaperRawData[formValues.category].papers[index] = { ...objFormated };

      await updateConfigFile(newPaperRawData);

      toast.style = Toast.Style.Success;
      toast.title = "Success";

      push(<ListMode />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Oups.. An error occured, please try again";
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit ${paper.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Edit ${paper.name}`} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        value={name}
        onChange={setName}
        title="Name of your paper"
        storeValue={true}
        error={nameError}
        onBlur={onBlurName}
      />
      <Form.DatePicker
        id="createdAt"
        value={createdAt}
        onChange={setCreatedAt}
        title="Created at"
        storeValue={true}
        // @ts-expect-error Raycast Type
        type={Form.DatePicker.Date}
        error={createdAtError}
        onBlur={onBlurCreatedAt}
      />
      <Form.TextArea
        id="content"
        value={content}
        storeValue={true}
        title="Content"
        onChange={setContent}
        enableMarkdown={true}
      />
      <Form.Dropdown
        id="category"
        title="Category"
        value={category}
        onChange={setCategory}
        storeValue={true}
        throttle={true}
      >
        {categories.map((category, index) => {
          if (category === "Deleted") return null;
          return <Form.Dropdown.Item title={category} value={category.toLowerCase()} key={index} />;
        })}
      </Form.Dropdown>
      <Form.TextField
        id="description"
        placeholder="Enter a description"
        info="Optional field"
        storeValue={true}
        value={description}
        onChange={setDescription}
        title="Description"
      />
    </Form>
  );
};

EditMode.displayName = "EditMode";
