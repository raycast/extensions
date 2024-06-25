import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";

type Values = {
  branchType: string;
  prefix: string;
  description: string;
  snakeCase: boolean;
  prefixDate: boolean;
};

function slugify(content: string, separator: string) {
  return content.toLowerCase().replaceAll(" ", separator);
}

export default function Command() {
  const handleSubmit = ({ branchType, prefix, description, snakeCase, prefixDate }: Values) => {
    const separator = snakeCase ? "_" : "-";
    const date = prefixDate ? `${new Date().toISOString().split("T")[0]}${separator}` : "";
    let content = `${date}${prefix}${branchType}${description}`;

    if (snakeCase && content.includes("-")) {
      content = content.replaceAll("-", "_");
    }

    const branchName = slugify(content, separator);
    Clipboard.copy(branchName);
    showToast({ title: branchName, message: "Copied to your clipboard!" });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Branch Name to Clipboard" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="branchType" title="Branch Type" storeValue>
        <Form.Dropdown.Item value="" title="-" />
        <Form.Dropdown.Item value="fix/" title="fix (bugs or issues)" />
        <Form.Dropdown.Item value="feat/" title="feat (add new features)" />
        <Form.Dropdown.Item value="refactor/" title="refactor (improve efficiency)" />
        <Form.Dropdown.Item value="chore/" title="chore (non-production changes)" />
        <Form.Dropdown.Item value="docs/" title="docs (add or modify documentation)" />
      </Form.Dropdown>
      <Form.TextField id="description" title="Description" placeholder="Description of this branch" storeValue />
      <Form.TextField
        id="prefix"
        title="Prefix"
        placeholder="Add a custom prefix for the branch: (e.g. jiwon)"
        storeValue
      />
      <Form.Checkbox
        id="snakeCase"
        title="Use `snake_case`"
        label="Use `snake_case` instead of `kebab-case`"
        storeValue
      />
      <Form.Checkbox
        id="prefixDate"
        title="Prefix Date"
        label="Add today's date as a prefix (e.g. 2024-06-05-)"
        storeValue
      />
      <Form.Checkbox
        id="includeGitCommand"
        title="Copy Git Command"
        label="Include `git checkout -b` when copying to clipboard"
        storeValue
      />
    </Form>
  );
}
