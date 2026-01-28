import { Action, ActionPanel, Clipboard, Form, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";

type Values = {
  branch_name: string;
  type_of_branch: string;
};

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const branchType = values.type_of_branch ? `${values.type_of_branch}/` : "";
      const branchNameAsSlug = values.branch_name
        ? values.branch_name
            .toLowerCase()
            // replace all but 0-9, a-z and / with a dash
            .replace(/[^0-9a-z/]/g, "-")
            // replace multiple dashes with a single dash
            .replace(/[-]+/g, "-")
            // trim dashes from the beginning
            .replace(/^-+/, "")
            // trim dashes from the end
            .replace(/-+$/, "")
            // only take the first 100 characters
            .substring(0, 100)
        : "";
      const fullBranchName = `${branchType}${branchNameAsSlug}`;
      Clipboard.copy(fullBranchName);
      await showHUD(`Copied to clipboard: ${fullBranchName}`);
      popToRoot({ clearSearchBar: true });
    },
    validation: {
      branch_name: (value) => {
        if (!value) return "Please enter a branch name";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type of Branch" {...itemProps.type_of_branch}>
        <Form.Dropdown.Item value="" title="" />
        <Form.Dropdown.Item value="bug" title="Bug" />
        <Form.Dropdown.Item value="chore" title="Chore" />
        <Form.Dropdown.Item value="feature" title="Feature" />
      </Form.Dropdown>
      <Form.TextField title="Branch name" placeholder="Change the photo" {...itemProps.branch_name} />
    </Form>
  );
}
