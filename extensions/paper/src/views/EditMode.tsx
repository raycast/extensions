import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { FC, useEffect } from "react";
import { Base64, Paper } from "../types";
import { decode } from "../utils/base64";
import { useGetConfig } from "../hooks/useGetConfig";
import { useGetCategories } from "../hooks/useGetCategories";
import { encode } from "../utils/base64";
import { updateConfigFile } from "../utils/updateConfigFile";
import { FormValidation, useForm } from "@raycast/utils";

type EditModeProps = {
  paper: Paper;
  paperCategory: string;
  index: number;
};

export const EditMode: FC<EditModeProps> = ({ paper, paperCategory, index }) => {
  const { isLoading, paperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);
  const { handleSubmit, itemProps, setValue } = useForm<{
    name: string;
    createdAt: Date | null;
    content: string;
    category: string;
    description?: string;
  }>({
    async onSubmit(values) {
      try {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Editing ${values.name} paper`,
        });

        const objFormated: Paper = {
          name: values.name,
          description: values.description || "",
          content: encode(values.content) as Base64,
          createdAt: new Date(values.createdAt as Date).getTime(),
        };
        const newPaperRawData = { ...paperDataRaw };

        if (values.category !== paperCategory) {
          newPaperRawData[paperCategory].papers.splice(index, 1);
          newPaperRawData[values.category].papers.push(objFormated);

          await updateConfigFile(newPaperRawData);

          toast.style = Toast.Style.Success;
          toast.title = "Success";

          popToRoot();
          return;
        }

        newPaperRawData[values.category].papers[index] = { ...objFormated };

        await updateConfigFile(newPaperRawData);

        toast.style = Toast.Style.Success;
        toast.title = "Success";

        popToRoot();
      } catch (error) {
        return false;
      }
    },
    validation: {
      name: FormValidation.Required,
      createdAt: FormValidation.Required,
      category: FormValidation.Required,
    },
    initialValues: {
      name: paper.name,
      createdAt: new Date(paper.createdAt),
      category: paperCategory,
      description: paper.description || "",
    },
  });

  useEffect(() => {
    setValue("content", decode(paper.content));
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit ${paper.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Edit ${paper.name}`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name of your paper" storeValue={true} {...itemProps.name} />
      <Form.DatePicker
        title="Created at"
        storeValue={true}
        // @ts-expect-error Raycast Type
        type={Form.DatePicker.Date}
        {...itemProps.createdAt}
      />
      <Form.TextArea storeValue={true} title="Content" enableMarkdown={true} {...itemProps.content} />
      <Form.Dropdown title="Category" storeValue={true} throttle={true} {...itemProps.category}>
        {categories.map((category, index) => {
          if (category === "Deleted") return null;
          return <Form.Dropdown.Item title={category} value={category.toLowerCase()} key={index} />;
        })}
      </Form.Dropdown>
      <Form.TextField
        placeholder="Enter a description"
        info="Optional field"
        storeValue={true}
        title="Description"
        {...itemProps.description}
      />
    </Form>
  );
};

EditMode.displayName = "EditMode";
