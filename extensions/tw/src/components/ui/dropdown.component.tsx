import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { useFilter, useProject, useTag } from "../../hooks/view.hook";
import { ViewTypes } from "../../core/helpers/ui.helper";

export function Dropdown({
  views,
  value,
  onChange,
}: {
  value: string;
  views: ViewTypes;
  onChange: (value: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Record<"filters" | "tags" | "projects", JSX.Element[]>>();

  useEffect(() => {
    setItems(
      views.all.reduce(
        (acc, { value, type }) => {
          if (type === "filter") {
            acc.filters.push(<List.Dropdown.Item {...useFilter(value)} />);
          } else if (type === "tag") {
            acc.tags.push(<List.Dropdown.Item {...useTag(value)} />);
          } else if (type === "project") {
            acc.projects.push(<List.Dropdown.Item {...useProject(value)} />);
          }
          return acc;
        },
        { filters: [], tags: [], projects: [] } as Record<"filters" | "tags" | "projects", JSX.Element[]>
      )
    );
    setIsLoading(false);
  }, [views]);

  return (
    <List.Dropdown isLoading={isLoading} onChange={onChange} tooltip="Select.." value={value}>
      {(items?.filters?.length ?? 0) > 0 && (
        <List.Dropdown.Section title="Filters">{items?.filters}</List.Dropdown.Section>
      )}
      {(items?.tags?.length ?? 0) > 0 && <List.Dropdown.Section title="Tags">{items?.tags}</List.Dropdown.Section>}
      {(items?.projects?.length ?? 0) > 0 && (
        <List.Dropdown.Section title="Projects">{items?.projects}</List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}
