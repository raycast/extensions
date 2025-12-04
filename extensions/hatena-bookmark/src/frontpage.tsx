import { List, showToast, Toast } from "@raycast/api";
import { startCase } from "lodash";
import { HotEntryListItem } from "./hotEntryListItem";
import { Topic, useStories } from "./useStories";
import { useEffect, useState } from "react";

export default function Command() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [items, isLoading, error] = useStories(topic);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading url",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={(!items && !error) || isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Page" storeValue onChange={(newValue) => setTopic(newValue as Topic)}>
          {Object.entries(Topic).map(([name, value]) => (
            <List.Dropdown.Item key={value} title={startCase(name)} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {items?.map((item, index) => (
        <HotEntryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}
