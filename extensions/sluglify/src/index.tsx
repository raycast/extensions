import { ActionPanel, Action, List } from "@raycast/api";

import { useState } from "react";

function string_to_slug(str: string): string {
  return str
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export default function Command() {
  const [slug, setSlug] = useState("");

  return (
    <List
      onSearchTextChange={(e) => {
        setSlug(string_to_slug(e));
      }}
      searchBarPlaceholder="Type your text"
      throttle
    >
      {slug.length > 0 && (
        <List.Section title="Your slug">
          <List.Item
            title={slug}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Slug" content={slug} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
