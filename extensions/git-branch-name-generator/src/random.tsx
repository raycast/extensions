import { Form, ActionPanel, Action, showHUD, PopToRootType, Clipboard } from "@raycast/api";
import { useForm } from "@raycast/utils";

type Values = {
  prefix: string;
  length: string;
  includeGitCommand: boolean;
};

export default function Random() {
  const { handleSubmit } = useForm<Values>({
    async onSubmit({ prefix, length, includeGitCommand }) {
      const branchLength = parseInt(length);
      const randomValue = (Math.random() * 1e20).toString(36).slice(0, branchLength);
      const gitCommand = includeGitCommand ? "git checkout -b " : "";
      const branchName = `${gitCommand}${prefix}${randomValue}`;

      Clipboard.copy(branchName);
      await showHUD(`Copied to your clipboard: ${branchName}`, {
        popToRootType: PopToRootType.Immediate,
        clearRootSearch: true,
      });
    },
  });

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
