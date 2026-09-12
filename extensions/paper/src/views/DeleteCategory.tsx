import { Form, confirmAlert, Alert, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { FC, useState } from "react";
import { useGetConfig } from "../hooks/useGetConfig";
import { useGetCategories } from "../hooks/useGetCategories";
import { updateConfigFile } from "../utils/updateConfigFile";

export const DeleteCategory: FC = () => {
  const { isLoading, paperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);
  const [category, setCategory] = useState<string>();

  const onSubmit = async (formValues: { category: string }) => {
    const userWanteDelete = await confirmAlert({
      title: `Delete ${formValues.category} ?`,
      message: "Are you sur to delete this category all papers related to will be moved in the deleted category",
      primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
    });

    if (userWanteDelete === false) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Delete ${category} Category`,
    });

    try {
      const newPaperRawData = { ...paperDataRaw };

      if (!newPaperRawData.deleted) {
        newPaperRawData.deleted = {
          color: "SecondaryText",
          papers: [],
        };
      }

      newPaperRawData[formValues.category.toLowerCase()].papers.forEach((paper) =>
        newPaperRawData.deleted.papers.push(paper),
      );

      delete newPaperRawData[formValues.category.toLowerCase()];

      await updateConfigFile(newPaperRawData);

      toast.style = Toast.Style.Success;
      toast.title = "Category deleted";

      popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Oups.. An error occured, please try again";
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Delete Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Delete Category" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="category"
        autoFocus={true}
        throttle={true}
        title="Select category to delete"
        value={category}
        onChange={setCategory}
      >
        {categories.map((category, index) => {
          if (category === "Deleted") return null;
          return <Form.Dropdown.Item value={category} title={category} key={index} />;
        })}
      </Form.Dropdown>
    </Form>
  );
};

DeleteCategory.displayName = "DeleteCategory";
