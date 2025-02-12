import { Image, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { Actions } from "./actions";
import { useSearch } from "./hooks/useSearch";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { result, loading, error } = useSearch(searchText);

  if (error) {
    showToast(
      Toast.Style.Failure,
      "Failed fetching review requests",
      error instanceof Error ? error.message : String(error)
    );
  }

  return (
    <List isLoading={loading} onSearchTextChange={setSearchText} throttle>
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
            actions={<Actions pr={pr} />}
            accessories={[
              {
                text: pr.updatedAt,
                icon: pr.authorAvatarUrl ? { source: pr.authorAvatarUrl, mask: Image.Mask.Circle } : undefined,
              },
            ]}
          />
        );
      })}
    </List>
  );
}
