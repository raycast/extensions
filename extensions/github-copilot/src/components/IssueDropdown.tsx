import { Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { useIssues } from "../hooks/useIssues";

type IssueDropdownProps = {
  repository: string | undefined;
  itemProps: Form.ItemProps<string>;
  onLoadingChange?: (isLoading: boolean) => void;
};

export function IssueDropdown(props: Readonly<IssueDropdownProps>) {
  const { repository, itemProps, onLoadingChange } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useIssues(repository || "", searchQuery);
  const { onChange, value, ...restItemProps } = itemProps;

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const issues = data?.issues || [];
  const issueIds = new Set(issues.map((issue) => issue.id));
  const firstIssueId = issues[0]?.id;

  // Only use value if it exists in current list, otherwise use first issue
  const effectiveValue = (value && issueIds.has(value) ? value : firstIssueId) || "";

  useEffect(() => {
    if (effectiveValue && effectiveValue !== value) {
      onChange?.(effectiveValue);
    }
  }, [effectiveValue, value, onChange]);

  if (!repository) {
    return (
      <Form.Dropdown title="Issue" {...restItemProps} value="" onChange={(val) => onChange?.(val)} isLoading={false}>
        <Form.Dropdown.Item title="Select a repository first" value="" icon={Icon.QuestionMark} />
      </Form.Dropdown>
    );
  }

  return (
    <Form.Dropdown
      title="Issue"
      placeholder="Select an issue"
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      onChange={(val) => onChange?.(val)}
      value={effectiveValue}
      throttle
      {...restItemProps}
    >
      {isLoading && issues.length === 0 && (
        <Form.Dropdown.Item title="Searching..." value="" icon={Icon.MagnifyingGlass} />
      )}
      {!isLoading && issues.length === 0 && (
        <Form.Dropdown.Item title="No open issues found" value="" icon={Icon.XMarkCircle} />
      )}
      {issues.length > 0 &&
        issues.map((issue) => (
          <Form.Dropdown.Item
            key={issue.id}
            title={`#${issue.number} ${issue.title}`}
            value={issue.id}
            icon={Icon.Circle}
          />
        ))}
    </Form.Dropdown>
  );
}
