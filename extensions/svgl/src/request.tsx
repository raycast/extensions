import { Action, ActionPanel, Form, LaunchProps, open, popToRoot } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Category } from "./type";
import { fetchCategories } from "./utils/fetch";
import { generateIssueURL } from "./utils/request-svg";

export interface RequestFormValues {
  iconName: string;
  category: string;
  sourceUrl: string;
  iconWebsiteUrl: string;
  permissionCheck: boolean;
  optimizedCheck: boolean;
  sizeCheck: boolean;
}

export default function Command(props: LaunchProps<{ draftValues: RequestFormValues }>) {
  const { draftValues } = props;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { handleSubmit, itemProps } = useForm<RequestFormValues>({
    onSubmit(values) {
      const issueUrl = generateIssueURL(values);
      open(issueUrl);
      popToRoot();
    },
    validation: {
      iconName: FormValidation.Required,
      category: FormValidation.Required,
      sourceUrl: FormValidation.Required,
      iconWebsiteUrl: FormValidation.Required,
      permissionCheck: FormValidation.Required,
      optimizedCheck: FormValidation.Required,
      sizeCheck: FormValidation.Required,
    },
    initialValues: {
      permissionCheck: true,
      optimizedCheck: true,
      sizeCheck: true,
      ...draftValues,
    },
  });

  useEffect(() => {
    const fetchCategoriesFn = async () => {
      setIsLoading(true);
      const categories = await fetchCategories();
      setCategories(categories);
      setIsLoading(false);
    };
    fetchCategoriesFn();
  }, []);

  return (
    <Form
      enableDrafts
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Icon Name" placeholder="Enter icon name" {...itemProps.iconName} />
      <Form.Dropdown title="Icon Category" placeholder="Select icon category" {...itemProps.category}>
        {categories.map((category) => (
          <Form.Dropdown.Item key={category.category} value={category.category} title={category.category} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Source URL (.svg)" placeholder="Enter source URL" {...itemProps.sourceUrl} />
      <Form.TextField title="Icon website URL" placeholder="Enter icon website URL" {...itemProps.iconWebsiteUrl} />
      <Form.Checkbox label="I have permission to use this logo." {...itemProps.permissionCheck} />
      <Form.Checkbox label="The link I have provided is optimized for web use." {...itemProps.optimizedCheck} />
      <Form.Checkbox label="The size of the SVG is less than 20kb." {...itemProps.sizeCheck} />
    </Form>
  );
}
