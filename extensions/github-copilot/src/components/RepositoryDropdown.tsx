import { Form } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Repository, useSearchRepositories } from "../hooks/useRepositorySearch";

export function RepositoryDropdown(props: {
  itemProps: Form.ItemProps<string>;
  organizations?: string[];
  onLoadingChange?: (isLoading: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [previousRepositories, setPreviousRepositories] = useCachedState<Repository[]>("previousRepositories", []);
  const { data, isLoading } = useSearchRepositories({
    searchQuery,
    organizations: props.organizations,
  });

  const { onChange, value, ...restItemProps } = props.itemProps;

  // Auto-select the first previously used repository if no value is set
  useEffect(() => {
    if (!value && previousRepositories.length > 0 && onChange) {
      onChange(previousRepositories[0].nameWithOwner);
    }
  }, [value, previousRepositories, onChange]);

  // Notify parent about loading state changes
  useEffect(() => {
    props.onLoadingChange?.(isLoading);
  }, [isLoading, props.onLoadingChange]);

  return (
    <Form.Dropdown
      title="Repository"
      placeholder="Select a repository"
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      onChange={(value) => {
        onChange?.(value);

        const repository = data?.nodes?.find((repository) => repository.nameWithOwner === value);
        if (repository) {
          setPreviousRepositories([
            repository,
            ...previousRepositories.filter((prevRepo) => prevRepo.id !== repository.id),
          ]);
        }
      }}
      value={value}
      {...restItemProps}
      throttle
    >
      <Form.Dropdown.Section title="Recently Used">
        {previousRepositories.map((repository) => (
          <Form.Dropdown.Item
            key={`${repository.id}-recent`}
            value={repository.nameWithOwner}
            title={repository.nameWithOwner}
          />
        ))}
      </Form.Dropdown.Section>
      <Form.Dropdown.Section title="All">
        {data?.nodes
          ?.filter((repository) => !previousRepositories.some((prevRepo) => prevRepo.id === repository.id))
          .map((repository) => (
            <Form.Dropdown.Item key={repository.id} value={repository.nameWithOwner} title={repository.nameWithOwner} />
          ))}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}
