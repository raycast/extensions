import { Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { postFromClipboard } from "../lib/post-input";

type PostArgumentProps = {
  argument: string;
  title: string;
  render: (post: string) => ReactNode;
};

async function copiedPost(): Promise<string | undefined> {
  return postFromClipboard(await Clipboard.readText());
}

export function PostArgument({ argument, title, render }: PostArgumentProps) {
  const typed = argument.trim();
  const { data: copied, isLoading } = usePromise(copiedPost, [], { execute: !typed });
  const [draft, setDraft] = useState("");
  const post = typed || copied;
  if (post) return render(post);
  const entered = draft.trim();
  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={draft}
      onSearchTextChange={setDraft}
      searchBarPlaceholder="Paste a Post Link or ID"
    >
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Link}
          title={entered ? "Press Enter to Open" : "Paste a Post Link"}
          description="Copy a post link on X before you open this command to skip this step."
          actions={
            entered ? (
              <ActionPanel>
                <Action.Push title={title} icon={Icon.ArrowRight} target={render(entered)} />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
    </List>
  );
}
