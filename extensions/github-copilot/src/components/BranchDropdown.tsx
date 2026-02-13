import { Form } from "@raycast/api";
import { useMemo, useState, useEffect, useRef } from "react";
import { useBranches } from "../hooks/useBranches";

type BranchDropdownProps = {
  itemProps: Form.ItemProps<string>;
  repository?: string;
  onLoadingChange?: (isLoading: boolean) => void;
};

export function BranchDropdown(props: Readonly<BranchDropdownProps>) {
  const { repository, itemProps, onLoadingChange } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const { branches, isLoading, defaultBranch } = useBranches(repository ?? "", searchQuery);

  const { onChange, value, ...restItemProps } = itemProps;
  const previousRepository = useRef(repository);

  // Clear branch value when repository changes
  useEffect(() => {
    if (previousRepository.current && previousRepository.current !== repository) {
      // Repository changed, clear the current branch value
      onChange?.("");
    }
    previousRepository.current = repository;
  }, [repository, onChange]);

  // Notify parent about loading state changes
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const controlledValue = useMemo(() => {
    if (value && branches.includes(value)) {
      return value;
    } else if (defaultBranch && branches.includes(defaultBranch)) {
      return defaultBranch;
    } else if (branches.length > 0) {
      return branches[0];
    } else {
      return ""; // Fallback to empty string to keep it controlled
    }
  }, [branches, defaultBranch, value]);

  // Update the form value when controlledValue changes
  useEffect(() => {
    if (controlledValue && controlledValue !== value && onChange) {
      onChange(controlledValue);
    }
  }, [controlledValue, value, onChange]);

  return (
    <Form.Dropdown
      title="Base Branch"
      placeholder="Select a base branch"
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      onChange={(value) => {
        onChange?.(value);
      }}
      value={controlledValue}
      info="Copilot will check out this branch, make changes, and create a pull request targeting this branch."
      {...restItemProps}
    >
      {branches.map((branch) => (
        <Form.Dropdown.Item
          key={`${repository}-${branch}`}
          title={branch === defaultBranch ? `${branch} (default)` : branch}
          value={branch}
        />
      ))}
    </Form.Dropdown>
  );
}
