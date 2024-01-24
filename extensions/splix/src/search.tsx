import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { convertNotesTimeStamps } from "./lib/utils";
import { NoteWithContent } from "./types";
import { BlockType, LeafType, serialize } from "remark-slate";
import { signOut } from "./auth/google";
import Protected from "./components/protected";

export default function Search() {
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState<NoteWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!searchText) return;
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("search-notes", {
        body: JSON.stringify({ input: searchText }),
      });
      if (error || !data?.data) {
        setIsLoading(false);
        return;
      }
      const notes = data?.data!.map(convertNotesTimeStamps) as NoteWithContent[];
      setData(notes);
      setIsLoading(false);
    })();
  }, [searchText]);

  return (
    <Protected>
      <List
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search for notes..."
        throttle
        actions={
          <ActionPanel title="Actions">
            <Action.OpenInBrowser title="Go to Splix.app" icon={Icon.Globe} url={"https://splix.app/dashboard"} />
            <Action title="Sign Out" icon={Icon.Logout} onAction={signOut} />
          </ActionPanel>
        }
      >
        {(searchText.length === 0 || isLoading) && (
          <List.EmptyView icon={Icon.MagnifyingGlass} title={"Find what you're looking for by vaugely describing it"} />
        )}
        <List.Section title="Results" subtitle={data.length + ""}>
          {data.map((note) => (
            <SearchListItem key={note.id} note={note} />
          ))}
        </List.Section>
      </List>
    </Protected>
  );
}

function NoteDetailView({ note }: { note: NoteWithContent }) {
  const markdown = (note.content as (BlockType | LeafType)[]).map((v: BlockType | LeafType) => serialize(v)).join("");
  return <Detail markdown={markdown} />;
}

function SearchListItem({ note }: { note: NoteWithContent }) {
  const { push } = useNavigation();
  return (
    <List.Item
      title={note.description}
      accessories={[{ icon: Icon.Calendar, text: note.updatedAt.toDateString() }]}
      actions={
        <ActionPanel>
          <Action title="View Note Content" onAction={() => push(<NoteDetailView note={note} />)} />
          <Action.OpenInBrowser title="Go to Splix.app" icon={Icon.Globe} url={"https://splix.app/dashboard"} />
        </ActionPanel>
      }
    />
  );
}
