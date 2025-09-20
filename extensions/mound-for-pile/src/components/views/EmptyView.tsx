import { List, ActionPanel } from "@raycast/api";
import { PileSettings, HighlightI } from "../../utils/types";
import CreatePileAction from "../actions/CreatePileAction";
import CreatePostAction from "../actions/CreatePostAction";

export function EmptyView({
  piles,
  searchText,
  filter,
  onCreate,
  onPileCreate,
}: {
  piles: PileSettings[] | null;
  searchText: string;
  filter: PileSettings | null;
  onCreate: (content: string, highlight: HighlightI) => void;
  onPileCreate: (name: string, theme: "light" | "dark", path: string) => void;
}) {
  if (piles?.length === 0) {
    return (
      <List.EmptyView
        icon="📚"
        title="Welcome to Mound!"
        description="Press ↵ to get started with a pile"
        actions={
          <ActionPanel>
            <CreatePileAction onCreate={onPileCreate} />
          </ActionPanel>
        }
      />
    );
  } else
    return (
      <List.EmptyView
        icon="📝"
        title={searchText ? `No results for "${searchText}"` : `No posts in ${filter?.name}`}
        description="Create a post to get started"
        actions={
          <ActionPanel>
            <CreatePostAction onCreate={onCreate} />
          </ActionPanel>
        }
      />
    );
}
