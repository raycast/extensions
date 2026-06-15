import { Form, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import type { Label } from "../../types/api";
import { groupLabels } from "../../utils/create-issue";

export default function LabelPicker({ labels, selectedRepo }: { labels: Label[]; selectedRepo: boolean }) {
  const [regularLabels, setRegularLabels] = useState<string[]>([]);
  const [exclusiveSelections, setExclusiveSelections] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    return groupLabels(labels);
  }, [labels]);

  if (!selectedRepo || labels.length === 0) {
    return null;
  }

  return (
    <>
      {grouped.regular.length > 0 && (
        <Form.TagPicker
          id="labels"
          title="Labels"
          placeholder="Select labels"
          value={regularLabels.filter((id) => grouped.regular.some((label) => label.id === parseInt(id, 10)))}
          onChange={(selected) => setRegularLabels(selected)}
        >
          {grouped.regular.map((label) => (
            <Form.TagPicker.Item
              key={label.id}
              value={String(label.id)}
              title={label.name ?? ""}
              icon={{ source: Icon.Circle, tintColor: `#${label.color}` }}
            />
          ))}
        </Form.TagPicker>
      )}
      {Object.entries(grouped.exclusive).map(([prefix, exclusiveLabels]) => (
        <Form.Dropdown
          key={prefix}
          id={`label.${prefix}`}
          title={prefix}
          value={exclusiveSelections[prefix] ?? ""}
          onChange={(value) => setExclusiveSelections((prev) => ({ ...prev, [prefix]: value }))}
        >
          <Form.Dropdown.Item key="none" title="None" value="" />
          {exclusiveLabels.map((label) => (
            <Form.Dropdown.Item
              key={label.id}
              value={String(label.id)}
              title={label.name?.replace(`${prefix}/`, "") ?? label.name ?? ""}
              icon={{ source: Icon.Circle, tintColor: `#${label.color}` }}
            />
          ))}
        </Form.Dropdown>
      ))}
    </>
  );
}
