import { List } from "@raycast/api";
import { RecommendFeedCategory } from "../utils/recommendFeedCategory";

export default function RecommendFeedCategoryDropdown({
  onChange,
}: {
  onChange: (category: RecommendFeedCategory) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Choose category"
      defaultValue={RecommendFeedCategory.iOS}
      storeValue={true}
      onChange={(value) => {
        onChange(RecommendFeedCategory[value as keyof typeof RecommendFeedCategory]);
      }}
    >
      {Object.entries(RecommendFeedCategory).map(([key, value]) => {
        return <List.Dropdown.Item key={value} value={key} title={key} />;
      })}
    </List.Dropdown>
  );
}
