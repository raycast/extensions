import { Action, ActionPanel, Form, open, popToRoot } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { generateIssueURL } from "./utils/request-svg";

export interface RequestFormValues {
  iconName: string;
  svgUrl: string;
  svgDarkUrl?: string;
  productUrl: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<RequestFormValues>({
    onSubmit(values) {
      const issueUrl = generateIssueURL(values);
      open(issueUrl);
      popToRoot();
    },
    validation: {
      iconName: FormValidation.Required,
      svgUrl: FormValidation.Required,
      productUrl: FormValidation.Required,
    },
  });

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Icon Name" placeholder="Enter icon name" {...itemProps.iconName} />
      <Form.TextField title="SVG URL" placeholder="Enter icon SVG URL" {...itemProps.svgUrl} />
      <Form.TextField
        title="SVG Dark Mode URL (optional)"
        placeholder="Enter icon SVG Dark Mode URL"
        {...itemProps.svgDarkUrl}
      />
      <Form.TextField title="Product URL" placeholder="Enter icon product URL" {...itemProps.productUrl} />
    </Form>
  );
}
