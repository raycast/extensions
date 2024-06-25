import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";

type Values = {
  prefix: string;
  length: string;
  includeGitCommand: boolean;
};

export default function Random() {
  const handleSubmit = ({ prefix, length, includeGitCommand }: Values) => {
    const branchLength = parseInt(length);
    const randomValue = (Math.random() * 1e20).toString(36).slice(0, branchLength);
    const branchName = `${prefix ? prefix + "/" : ""}${randomValue}`;
    const gitCommand = includeGitCommand ? "git checkout -b " : "";

    const result = `${gitCommand}${branchName}`;
    Clipboard.copy(result);
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
      <Form.TextField id="prefix" title="Prefix" placeholder="Add prefix of the branch: (e.g. jwn/~)" storeValue />
      <Form.TextField id="length" title="Length" defaultValue="4" storeValue />
      <Form.Checkbox
        id="includeGitCommand"
        title="Copy Git Command"
        label="Include `git checkout -b` when copying to clipboard"
        storeValue
      />
    </Form>
  );
}
