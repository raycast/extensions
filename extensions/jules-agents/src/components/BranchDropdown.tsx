import { Form } from "@raycast/api";
import { Source } from "../types";

interface BranchDropdownProps {
  selectedSource: Source | undefined;
  itemProps: {
    startingBranch: {
      value?: string | undefined;
      onChange?: ((value: string) => void) | undefined;
      error?: string | undefined;
      id: string;
    };
  };
}

export function BranchDropdown({ selectedSource, itemProps }: BranchDropdownProps) {
  const githubRepo = selectedSource?.githubRepo;
  const branches = githubRepo?.branches;

  if (branches && branches.length > 0) {
    return (
      <Form.Dropdown
        title="Starting Branch"
        info="The branch to base the feature branch on. If not provided, the default branch will be used."
        {...itemProps.startingBranch}
      >
        {branches.map((branch, index) => (
          <Form.Dropdown.Item key={`${branch.name}-${index}`} value={branch.displayName} title={branch.displayName} />
        ))}
      </Form.Dropdown>
    );
  }

  return (
    <Form.TextField
      title="Starting Branch"
      placeholder="main"
      info="The branch to base the feature branch on. If not provided, the default branch will be used."
      {...itemProps.startingBranch}
    />
  );
}
