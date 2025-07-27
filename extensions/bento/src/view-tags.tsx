import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getTags, Tag } from "./api-client";

export default function ViewTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTags() {
      try {
        const fetchedTags = await getTags();
        setTags(fetchedTags);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch tags");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTags();
  }, []);

  return (
    <List isLoading={isLoading}>
      {tags.map((tag) => (
        <List.Item
          key={tag.id}
          title={tag.name}
          subtitle={`Created: ${new Date(tag.created_at).toLocaleString()}`}
          accessories={[{ text: tag.discarded_at ? "Discarded" : "Active" }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={tag.name} title="Copy Tag Name" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
