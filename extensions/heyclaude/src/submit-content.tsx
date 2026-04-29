import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useRef } from "react";
import {
  SUBMIT_URL,
  buildContributeEntryUrl,
  buildSubmitIssueUrl,
  categoryLabels,
} from "./feed";
import {
  buildSubmissionDraftText,
  commonSubmissionTags,
  isValidDomain,
  isValidHttpsUrl,
  normalizeSubmissionDraft,
  type SubmissionFormValues,
} from "./submission";

type SubmissionAction = "submit" | "issue" | "copy";

const categoryItems = Object.entries(categoryLabels).map(
  ([category, label]) => ({
    value: category,
    title: label,
  }),
);

async function openSubmit(values: SubmissionFormValues) {
  await open(buildContributeEntryUrl(normalizeSubmissionDraft(values)));
}

async function openIssue(values: SubmissionFormValues) {
  await open(buildSubmitIssueUrl(normalizeSubmissionDraft(values)));
}

async function copyDraft(values: SubmissionFormValues) {
  await Clipboard.copy(
    buildSubmissionDraftText(normalizeSubmissionDraft(values)),
  );
  await showToast({
    style: Toast.Style.Success,
    title: "Copied submission draft",
    message: values.title,
  });
}

export default function Command() {
  const submissionAction = useRef<SubmissionAction>("submit");
  const { handleSubmit, itemProps } = useForm<SubmissionFormValues>({
    initialValues: { category: "mcp", tags: [] },
    async onSubmit(values) {
      const action = submissionAction.current;

      if (action === "issue") {
        await openIssue(values);
        return;
      }

      if (action === "copy") {
        await copyDraft(values);
        return;
      }

      await openSubmit(values);
      await showToast({
        style: Toast.Style.Success,
        title: "Opened HeyClaude submit form",
        message: values.title,
      });
    },
    validation: {
      category: FormValidation.Required,
      title: FormValidation.Required,
      sourceUrl(value) {
        if (!value) return "Source or docs URL is required";
        if (!isValidHttpsUrl(value)) return "Use a valid HTTPS URL";
      },
      brandDomain(value) {
        if (value && !isValidDomain(value)) {
          return "Use a canonical domain like asana.com";
        }
      },
    },
  });

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open HeyClaude Submit Form"
            icon={Icon.Plus}
            onSubmit={(values: SubmissionFormValues) => {
              submissionAction.current = "submit";
              return handleSubmit(values);
            }}
          />
          <Action.SubmitForm
            title="Open GitHub Issue Template"
            icon={Icon.Globe}
            onSubmit={(values: SubmissionFormValues) => {
              submissionAction.current = "issue";
              return handleSubmit(values);
            }}
          />
          <Action.SubmitForm
            title="Copy Submission Draft"
            icon={Icon.Clipboard}
            onSubmit={(values: SubmissionFormValues) => {
              submissionAction.current = "copy";
              return handleSubmit(values);
            }}
          />
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser
              title="Open Blank Submit Form"
              url={SUBMIT_URL}
              icon={Icon.Plus}
            />
            <Action.OpenInBrowser
              title="Open GitHub Issue Chooser"
              url="https://github.com/JSONbored/claudepro-directory/issues/new/choose"
              icon={Icon.Globe}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Category" {...itemProps.category}>
        {categoryItems.map((item) => (
          <Form.Dropdown.Item
            key={item.value}
            value={item.value}
            title={item.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Name"
        placeholder="Asana MCP Server"
        {...itemProps.title}
      />
      <Form.TextField
        title="Slug"
        placeholder="asana-mcp-server"
        info="Optional. Leave blank to derive from the name."
        {...itemProps.slug}
      />
      <Form.TextField
        title="Source or Docs URL"
        placeholder="https://..."
        {...itemProps.sourceUrl}
      />
      <Form.TextField
        title="Brand Name"
        placeholder="Asana"
        {...itemProps.brandName}
      />
      <Form.TextField
        title="Brand Domain"
        placeholder="asana.com"
        info="Use the provider's canonical domain, not GitHub or docs hosting."
        {...itemProps.brandDomain}
      />
      <Form.TextArea
        title="Short Description"
        placeholder="Explain what this does and when someone should use it."
        {...itemProps.description}
      />
      <Form.TagPicker
        title="Tags"
        placeholder="Select or type tags"
        {...itemProps.tags}
      >
        {commonSubmissionTags.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
