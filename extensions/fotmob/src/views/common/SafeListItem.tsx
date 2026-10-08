import type { ComponentProps } from "react";
import { List } from "@raycast/api";

export type SafeListItemProps = ComponentProps<typeof List.Item> & {
  title?: string;
};

export default function SafeListItem({ title, ...props }: SafeListItemProps) {
  // Ensure title is never empty, null, undefined, or just whitespace
  const safeTitle = (() => {
    if (!title || typeof title !== "string") {
      return "Unknown Item";
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle === "null" || trimmedTitle === "undefined") {
      return "Unknown Item";
    }

    return trimmedTitle;
  })();

  return <List.Item {...props} title={safeTitle} />;
}
