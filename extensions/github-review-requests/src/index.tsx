import { Image, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { Actions } from "./actions";
import { useSearch } from "./hooks/useSearch";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [debouncedSearchText] = useDebounce(searchText, 200);
  const { result, loading, error } = useSearch(debouncedSearchText);

  if (error) {
    showToast(
      Toast.Style.Failure,
      "Failed fetching review requests",
      error instanceof Error ? error.message : String(error)
    );
  }

  return (
    <List isLoading={loading} onSearchTextChange={setSearchText}>
      {result.map((pr, index) => {
        const icon = (() => {
          if (pr.status === "success") {
            return { source: "success.png" };
          } else if (pr.status === "failure") {
            return { source: "failure.png" };
          } else if (pr.status === "pending") {
            return { source: "pending.png" };
          }
          return "success.png";
        })();

        return (
          <List.Item
            key={index}
            icon={icon}
            title={pr.title}
            subtitle={pr.repository ?? ""}
            accessoryTitle={pr.updatedAt}
            accessoryIcon={pr.authorAvatarUrl ? { source: pr.authorAvatarUrl, mask: Image.Mask.Circle } : undefined}
            actions={<Actions pr={pr} />}
          />
        );
      })}
    </List>
  );
}
