import { Form } from "@raycast/api";
import { useMemo, useState, useEffect, useRef } from "react";
import { useBranches } from "../hooks/useBranches";

export function BranchDropdown(props: {
  itemProps: Form.ItemProps<string>;
  repository?: string;
  onLoadingChange?: (isLoading: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { branches, isLoading, defaultBranch } = useBranches(props.repository ?? "", searchQuery);

  const { onChange, value, ...restItemProps } = props.itemProps;
  const previousRepository = useRef(props.repository);

  // Clear branch value when repository changes
  useEffect(() => {
    if (previousRepository.current && previousRepository.current !== props.repository) {
      // Repository changed, clear the current branch value
      onChange?.("");
    }
    previousRepository.current = props.repository;
  }, [props.repository, onChange]);

  // Notify parent about loading state changes
  useEffect(() => {
    props.onLoadingChange?.(isLoading);
  }, [isLoading, props.onLoadingChange]);

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
          key={`${props.repository}-${branch}`}
          title={branch === defaultBranch ? `${branch} (default)` : branch}
          value={branch}
        />
      ))}
    </Form.Dropdown>
  );
}
